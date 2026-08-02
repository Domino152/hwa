import type { Request, Response } from 'express';
import type { ChatService } from './chat.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { AppError } from '../../shared/utils/errors.js';
import { normalizePhoneNumber, formatJid } from './utils/phone.js';
import { sendMessageSchema } from './schemas.js';

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
      throw new AppError('Invalid request body', 400, 'VALIDATION_ERROR');
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

  logout = async (_req: Request, res: Response): Promise<void> => {
    await this.chatService.logout();
    sendSuccess(res, { message: 'Logged out successfully' });
  };
}
