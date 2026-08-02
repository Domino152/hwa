import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/utils/response.js';
import { isDBConnected } from '../../database/index.js';
import type { ChatService } from '../whatsapp/chat.service.js';
import { ServiceUnavailableError } from '../../shared/utils/errors.js';

export class HealthController {
  constructor(private readonly chatService?: ChatService) {}

  health = (_req: Request, res: Response): void => {
    sendSuccess(res, { status: 'ok', uptime: process.uptime() });
  };

  ready = (_req: Request, res: Response): void => {
    const dbReady = isDBConnected();
    const waReady = this.chatService?.isConnected() ?? false;

    if (!dbReady || !waReady) {
      throw new ServiceUnavailableError(
        `Service not ready: DB=${dbReady ? 'connected' : 'disconnected'}, WhatsApp=${waReady ? 'connected' : 'disconnected'}`,
      );
    }

    sendSuccess(res, { status: 'ready', db: 'connected', whatsapp: 'connected' });
  };

  live = (_req: Request, res: Response): void => {
    const memUsage = process.memoryUsage();
    sendSuccess(res, {
      status: 'alive',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
      },
      pid: process.pid,
      nodeVersion: process.version,
    });
  };
}
