import type { Request, Response } from 'express';
import type { ChatService } from './chat.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { AppError, ValidationError } from '../../shared/utils/errors.js';
import { normalizePhoneNumber, formatJid } from './utils/phone.js';
import { sendMessageSchema } from './schemas.js';
import { buildMainMenuList } from '../../chatbot/index.js';

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
}
