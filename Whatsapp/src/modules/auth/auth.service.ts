import { User } from '../../database/models/User.js';
import { LoginToken } from '../../database/models/LoginToken.js';
import { comparePassword } from './password.service.js';
import { signToken, type TokenPayload } from './token.service.js';
import { toSafeUser, type LoginRequest, type LoginResponse, type LinkWhatsAppResponse, type UserStatusResponse, type MeResponse } from './auth.types.js';
import { UnauthorizedError, ConflictError, NotFoundError } from '../../shared/utils/errors.js';
import { normalizePhoneNumber } from '../whatsapp/utils/phone.js';
import logger from '../../shared/utils/logger.js';

const authLogger = logger.child({ module: 'auth' });

export class AuthService {
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
   * Also activates the WhatsApp session.
   * Throws ConflictError if the phone is already linked to a different account.
   */
  async linkWhatsApp(userId: string, phone: string): Promise<LinkWhatsAppResponse> {
    const normalizedPhone = normalizePhoneNumber(phone);

    const existingUser = await User.findOne({ whatsappNumber: normalizedPhone });
    if (existingUser && String(existingUser._id) !== userId) {
      throw new ConflictError(
        'This phone number is already linked to another account. Please log out of that account first.',
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { whatsappNumber: normalizedPhone, whatsappSessionActive: true },
      { new: true },
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    authLogger.info({ userId, phone: normalizedPhone }, 'WhatsApp linked');

    return {
      id: String(user._id),
      fullName: user.fullName,
      username: user.username,
      whatsappNumber: normalizedPhone,
    };
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
  async generateLoginToken(phone: string): Promise<{ tokenId: string; rawToken: string }> {
    const normalized = normalizePhoneNumber(phone);
    const { tokenId, rawToken } = await LoginToken.createForPhone(normalized);
    authLogger.info({ tokenId, phone: normalized }, 'Login token generated for WhatsApp');
    return { tokenId, rawToken };
  }

  /**
   * Redeem a single-use login token.
   * Returns the bound phone number (and the user id if already linked).
   * If a user is already linked to that phone, their WhatsApp session is
   * activated; otherwise the frontend links the phone after login.
   * Marks the token as used to prevent replay.
   */
  async redeemLoginToken(rawToken: string): Promise<{ phone: string; userId: string | null } | null> {
    const tokenDoc = await LoginToken.findValid(rawToken);
    if (!tokenDoc) {
      authLogger.warn('Login token redemption failed (invalid, expired, or already used)');
      return null;
    }

    const user = await User.findOne({ whatsappNumber: tokenDoc.phone });

    let userId: string | null = null;
    if (user) {
      await User.findByIdAndUpdate(user._id, { whatsappSessionActive: true });
      userId = String(user._id);
    }

    await LoginToken.markUsed(String(tokenDoc._id));

    authLogger.info(
      { tokenId: String(tokenDoc._id), phone: tokenDoc.phone, userId },
      'Login token redeemed',
    );

    return { phone: tokenDoc.phone, userId };
  }
}
