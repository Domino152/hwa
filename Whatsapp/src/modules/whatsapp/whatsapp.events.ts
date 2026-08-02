import { emitToAll } from '../../sockets/index.js';
import logger from '../../shared/utils/logger.js';

const waLogger = logger.child({ module: 'whatsapp-events' });

export function setupWhatsAppEvents(): void {
  waLogger.info('WhatsApp event handlers registered');
}

export function broadcastQR(qr: string, timeout: number): void {
  emitToAll('qr', { qr, timeout });
}

export function broadcastConnectionStatus(state: string): void {
  emitToAll('connection-status', {
    state,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastLog(level: string, message: string): void {
  emitToAll('log', {
    level,
    message,
    timestamp: new Date().toISOString(),
  });
}
