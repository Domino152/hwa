import type { Request, Response } from 'express';
import type { ChatService } from './chat.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { AppError, ValidationError } from '../../shared/utils/errors.js';
import { normalizePhoneNumber, formatJid } from './utils/phone.js';
import { sendMessageSchema, registerStudentSchema } from './schemas.js';
import { buildMainMenuList } from '../../chatbot/index.js';
import { User } from '../../database/models/User.js';

export class WhatsAppController {
  constructor(private readonly chatService: ChatService) {}

  getQR = (_req: Request, res: Response): void => {
    const qr = this.chatService.getQR();
    if (!qr) {
      throw new AppError('No QR code available', 404, 'NO_QR');
    }
    sendSuccess(res, { qr, timeout: 60_000 });
  };

  getConnectionStatus = (_req: Request, res: Response): void => {
    const status = this.chatService.getStatus();
    sendSuccess(res, status);
  };

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.format());
    }

    const { phone, message } = parsed.data;

    const normalizedPhone = normalizePhoneNumber(phone);
    const jid = formatJid(normalizedPhone);

    if (!this.chatService.isConnected()) {
      throw new AppError(
        'WhatsApp is not connected. Please scan the QR code first.',
        503,
        'WA_NOT_CONNECTED',
      );
    }

    const result = await this.chatService.sendMessage(jid, message, req.requestId);

    sendSuccess(res, {
      messageId: result.messageId,
      jid,
      phone: normalizedPhone,
    });
  };

  sendMenu = async (req: Request, res: Response): Promise<void> => {
    const { phone } = req.body as { phone: string };

    if (!phone) {
      throw new ValidationError('phone is required', { phone: ['Required'] });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const jid = formatJid(normalizedPhone);

    if (!this.chatService.isConnected()) {
      throw new AppError(
        'WhatsApp is not connected. Please scan the QR code first.',
        503,
        'WA_NOT_CONNECTED',
      );
    }

    const menu = buildMainMenuList(false);

    const messageId = await this.chatService.sendListMessage(jid, menu);

    sendSuccess(res, {
      messageId,
      jid,
      phone: normalizedPhone,
      type: 'list',
    });
  };

  logout = async (_req: Request, res: Response): Promise<void> => {
    await this.chatService.logout();
    sendSuccess(res, { message: 'Logged out successfully' });
  };

  registerStudent = async (req: Request, res: Response): Promise<void> => {
    const parsed = registerStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.format());
    }

    const { phone, registerNumber, fullName, department, year, section, password } = parsed.data;
    const normalizedPhone = normalizePhoneNumber(phone);

    const { hashPassword } = await import('../../modules/auth/password.service.js');
    const passwordHash = await hashPassword(password);

    const existingUser = await User.findOne({ studentId: registerNumber, isActive: true });

    if (existingUser) {
      existingUser.whatsappNumber = normalizedPhone;
      existingUser.whatsappSessionActive = true;
      existingUser.fullName = fullName;
      existingUser.department = department;
      existingUser.year = year;
      existingUser.section = section;
      existingUser.passwordHash = passwordHash;
      await existingUser.save();
      sendSuccess(res, { userId: String(existingUser._id), studentId: registerNumber, action: 'updated' });
      return;
    }

    const newUser = await User.create({
      fullName,
      username: registerNumber,
      passwordHash,
      role: 'student',
      studentId: registerNumber,
      whatsappNumber: normalizedPhone,
      whatsappSessionActive: true,
      department,
      year,
      section,
    });

    sendSuccess(res, { userId: String(newUser._id), studentId: registerNumber, action: 'created' });
  };
}
