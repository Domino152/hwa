import { User } from '../../database/models/User.js';
import { LoginToken } from '../../database/models/LoginToken.js';
import { Conversation } from '../../database/models/Conversation.js';
import { comparePassword } from './password.service.js';
import { signToken, type TokenPayload } from './token.service.js';
import { toSafeUser, type LoginRequest, type LoginResponse, type LinkWhatsAppResponse, type UserStatusResponse, type MeResponse } from './auth.types.js';
import { UnauthorizedError, ConflictError, NotFoundError } from '../../shared/utils/errors.js';
import { normalizePhoneNumber, formatJid } from '../whatsapp/utils/phone.js';
import type { ChatService } from '../whatsapp/chat.service.js';
import { buildHelpMenu, buildTextFallbackMenu } from '../../chatbot/index.js';
import logger from '../../shared/utils/logger.js';

const authLogger = logger.child({ module: 'auth' });

export class AuthService {
  private chatService: ChatService | null = null;

  /**
   * Inject the ChatService for sending WhatsApp messages.
   * Called from the composition root after both services are constructed.
   */
  setChatService(chatService: ChatService): void {
    this.chatService = chatService;
  }

  /**
   * Authenticate a user by username, password, and role.
   * Returns the signed JWT and sanitized user profile.
   */
  async login(params: LoginRequest): Promise<LoginResponse> {
    const user = await User.findOne({
      username: params.username,
      role: params.role,
      isActive: true,
    }).select('+passwordHash');

    if (!user) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const isMatch = await comparePassword(params.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const tokenPayload: TokenPayload = {
      userId: String(user._id),
      username: user.username,
      role: user.role,
    };

    const token = signToken(tokenPayload);

    authLogger.info({ userId: String(user._id), username: user.username, role: user.role }, 'User logged in');

    return {
      user: toSafeUser(user),
      token,
    };
  }

  /**
   * Get current user by ID. Returns sanitized user profile.
   */
  async getCurrentUser(userId: string): Promise<MeResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return toSafeUser(user);
  }

  /**
   * Link a WhatsApp phone number to an authenticated user.
   * Also activates the WhatsApp session and sends a confirmation message.
   * Throws ConflictError if the phone is already linked to a different account.
   */
  async linkWhatsApp(userId: string, phone: string, lid?: string): Promise<LinkWhatsAppResponse> {
    const normalizedPhone = normalizePhoneNumber(phone);

    const existingUser = await User.findOne({
      $or: [
        { whatsappNumber: normalizedPhone },
        ...(lid ? [{ whatsappLid: lid }] : []),
      ],
      isActive: true,
    });
    if (existingUser && String(existingUser._id) !== userId) {
      throw new ConflictError(
        'This phone number is already linked to another account. Please log out of that account first.',
      );
    }

    const updateData: Record<string, unknown> = {
      whatsappNumber: normalizedPhone,
      whatsappSessionActive: true,
    };
    if (lid) {
      updateData.whatsappLid = lid;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true },
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    authLogger.info({ userId, phone: normalizedPhone, lid }, 'WhatsApp linked');

    // Send "logged in successfully" WhatsApp message (fire-and-forget)
    void this.sendLoginConfirmation(user.fullName, normalizedPhone, lid, user.role).catch((err) => {
      authLogger.warn({ err, userId, phone: normalizedPhone }, 'Failed to send login confirmation message');
    });

    return {
      id: String(user._id),
      fullName: user.fullName,
      username: user.username,
      whatsappNumber: normalizedPhone,
    };
  }

  /**
   * Send a WhatsApp confirmation message to the user after successful login.
   * Uses the LID JID if available (for linked devices) — otherwise the phone JID.
   * Runs as fire-and-forget; failures are logged but don't affect the link response.
   */
  private async sendLoginConfirmation(
    fullName: string,
    phone: string,
    lid: string | undefined,
    role: 'student' | 'parent',
  ): Promise<void> {
    if (!this.chatService || !this.chatService.isConnected()) {
      authLogger.debug('ChatService not available — skipping login confirmation');
      return;
    }

    const fallbackJid = lid ? formatJid(lid, 'lid') : formatJid(phone);

    let targetJid = fallbackJid;
    try {
      const conversation = await Conversation.findOne({ phone })
        .select('jid')
        .lean();
      if (conversation?.jid) {
        targetJid = conversation.jid;
      }
    } catch (err) {
      authLogger.warn({ err, phone }, 'Failed to look up conversation JID — using fallback');
    }

    const greeting = role === 'parent' ? 'Welcome!' : 'Welcome back!';
    const message =
      `✅ *You have signed in successfully!*\n\n` +
      `Hi *${fullName}*! 👋\n` +
      `${greeting}\n\n` +
      `Your WhatsApp is now linked to your college account.\n` +
      `You can return to this chat and use any of the available commands.\n\n` +
      `Type *help* anytime to see what you can do.`;

    const menu = buildHelpMenu(true);
    const textFallback = buildTextFallbackMenu(menu);
    const timestamp = Date.now();

    try {
      await this.chatService.sendMessage(targetJid, message, `login-confirm-${timestamp}`);
      authLogger.info({ fullName, jid: targetJid }, 'Login confirmation sent via WhatsApp');
    } catch (err) {
      authLogger.error({ err, jid: targetJid }, 'Failed to send login confirmation');
    }

    try {
      const listMessageId = await this.chatService.sendListMessage(
        targetJid,
        menu,
        textFallback,
        `login-menu-${timestamp}`,
      );
      if (listMessageId) {
        authLogger.info({ fullName, jid: targetJid }, 'Login menu sent via WhatsApp');
      } else {
        authLogger.warn({ jid: targetJid }, 'List message returned null — sending text fallback');
        await this.chatService.sendMessage(
          targetJid,
          textFallback,
          `login-menu-fallback-${timestamp}`,
        );
      }
    } catch (err) {
      authLogger.warn({ err, jid: targetJid }, 'Failed to send login menu — trying text fallback');
      try {
        await this.chatService.sendMessage(
          targetJid,
          textFallback,
          `login-menu-fallback-${timestamp}`,
        );
      } catch (fallbackErr) {
        authLogger.error({ fallbackErr, jid: targetJid }, 'Failed to send login menu text fallback');
      }
    }

    // Send quick-action buttons after the list menu
    try {
      await this.chatService.sendButtonsMessage(
        targetJid,
        {
          text: '_Quick Actions:_',
          footerText: 'Tap an option or type a message',
          buttons: [
            { id: 'intent:attendance', text: '📊 Attendance' },
            { id: 'intent:fees', text: '💰 Fees' },
            { id: 'intent:help', text: '❓ Help' },
          ],
        },
      );
      authLogger.info({ fullName, jid: targetJid }, 'Login quick actions sent via WhatsApp');
    } catch (err) {
      authLogger.debug({ err, jid: targetJid }, 'Failed to send login quick actions (non-critical)');
    }
  }

  /**
   * Unlink WhatsApp phone number from the user (logout from WhatsApp).
   * Also deactivates the WhatsApp session.
   */
  async unlinkWhatsApp(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      whatsappNumber: null,
      whatsappSessionActive: false,
    });
    authLogger.info({ userId }, 'WhatsApp unlinked');
  }

  /**
   * Activate the WhatsApp session for a user.
   * Called after successful login via the web portal.
   */
  async activateWhatsAppSession(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { whatsappSessionActive: true });
    authLogger.info({ userId }, 'WhatsApp session activated');
  }

  /**
   * Deactivate the WhatsApp session for a user.
   * Called when the user sends "logout" from WhatsApp.
   * Does NOT unlink the phone number — only invalidates the session.
   */
  async deactivateWhatsAppSession(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { whatsappSessionActive: false });
    authLogger.info({ userId }, 'WhatsApp session deactivated');
  }

  /**
   * Deactivate WhatsApp session by phone number.
   * Used by the chatbot logout handler.
   */
  async deactivateWhatsAppSessionByPhone(phone: string): Promise<void> {
    const user = await User.findOne({ whatsappNumber: phone });
    if (user) {
      await User.findByIdAndUpdate(user._id, { whatsappSessionActive: false });
      authLogger.info({ userId: String(user._id) }, 'WhatsApp session deactivated via chatbot');
    }
  }

  /**
   * Check whether the user is linked to a WhatsApp number.
   */
  async getStatus(userId: string): Promise<UserStatusResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user.whatsappNumber
      ? { linked: true, phone: user.whatsappNumber }
      : { linked: false };
  }

  /**
   * Find a user by their linked WhatsApp number.
   * Returns null if no user is linked to this phone.
   */
  async findByPhone(phone: string) {
    return User.findByPhone(phone);
  }

  /**
   * Generate a single-use, short-lived login token bound to a phone number.
   * Returns the raw token (never stored in plaintext).
   * Used to produce secure WhatsApp login URLs.
   */
  async generateLoginToken(phone: string, lid?: string): Promise<{ tokenId: string; rawToken: string }> {
    const normalized = normalizePhoneNumber(phone);
    const { tokenId, rawToken } = await LoginToken.createForPhone(normalized, lid);
    authLogger.info({ tokenId, phone: normalized, lid }, 'Login token generated for WhatsApp');
    return { tokenId, rawToken };
  }

  /**
   * Redeem a single-use login token.
   * Returns the bound phone number, user ID (if linked), and LID if valid, null otherwise.
   * Activates the WhatsApp session so the next message is recognized as authenticated.
   * Marks the token as used to prevent replay.
   * Does NOT require the user to be already linked — linking happens in linkWhatsApp.
   */
  async redeemLoginToken(rawToken: string): Promise<{ phone: string; userId?: string; lid?: string } | null> {
    const tokenDoc = await LoginToken.findValid(rawToken);
    if (!tokenDoc) {
      authLogger.warn('Login token redemption failed (invalid, expired, or already used)');
      return null;
    }

    const user = await User.findOne({
      $or: [
        { whatsappNumber: tokenDoc.phone },
        ...(tokenDoc.lid ? [{ whatsappLid: tokenDoc.lid }] : []),
      ],
    });

    let userId: string | undefined = undefined;
    if (user) {
      await User.findByIdAndUpdate(user._id, { whatsappSessionActive: true });
      userId = String(user._id);
    }

    await LoginToken.markUsed(String(tokenDoc._id));

    authLogger.info(
      { tokenId: String(tokenDoc._id), phone: tokenDoc.phone, lid: tokenDoc.lid, userId },
      'Login token redeemed',
    );

    return {
      phone: tokenDoc.phone,
      lid: tokenDoc.lid ?? undefined,
      userId,
    };
  }
}
