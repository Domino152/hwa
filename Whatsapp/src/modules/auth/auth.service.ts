import { User } from '../../database/models/User.js';
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
      { whatsappNumber: normalizedPhone },
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
   */
  async unlinkWhatsApp(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { whatsappNumber: null });
    authLogger.info({ userId }, 'WhatsApp unlinked');
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
}
