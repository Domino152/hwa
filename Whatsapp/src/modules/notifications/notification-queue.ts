import { type INotification } from '../../database/models/Notification.js';
import type { NotificationPriority } from '../../database/models/Notification.js';
import logger from '../../shared/utils/logger.js';

const PRIORITY_ORDER: Record<NotificationPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const DEFAULT_PROCESS_INTERVAL_MS = 2_000;
const MAX_RETRIES = 3;

export interface WhatsAppSender {
  sendMessage(jid: string, text: string, requestId: string): Promise<{ messageId: string }>;
}

export interface QueueStatus {
  pending: number;
  queued: number;
  sent: number;
  failed: number;
  processing: boolean;
}

export class NotificationQueue {
  private queue: INotification[] = [];
  private processing = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private whatsappService: WhatsAppSender | null = null;
  private readonly logger = logger.child({ module: 'notification-queue' });

  setWhatsAppService(service: WhatsAppSender): void {
    this.whatsappService = service;
  }

  enqueue(notification: INotification): void {
    this.queue.push(notification);
    this.sortByPriority();
    this.logger.info(
      { notificationId: String(notification._id), type: notification.type, priority: notification.priority },
      'Notification enqueued',
    );
  }

  dequeue(): INotification | null {
    const now = new Date();
    const index = this.queue.findIndex((n) => {
      if (n.status !== 'pending' && n.status !== 'queued') return false;
      if (n.scheduledFor && n.scheduledFor > now) return false;
      return true;
    });
    if (index === -1) return null;
    const item = this.queue.splice(index, 1)[0];
    return item ?? null;
  }

  sortByPriority(): void {
    this.queue.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      const sa = a.scheduledFor?.getTime() ?? 0;
      const sb = b.scheduledFor?.getTime() ?? 0;
      return sa - sb;
    });
  }

  async processNext(): Promise<boolean> {
    const notification = this.dequeue();
    if (!notification) return false;

    if (!this.whatsappService) {
      this.logger.warn('No WhatsApp service attached — skipping notification');
      await this.markFailed(notification, 'WhatsApp service not available');
      return false;
    }

    if (!notification.recipient.phone) {
      this.logger.warn(
        { notificationId: String(notification._id) },
        'No phone number for recipient — skipping',
      );
      await this.markFailed(notification, 'No phone number');
      return false;
    }

    const jid = `${notification.recipient.phone}@s.whatsapp.net`;
    const requestId = `notif-${String(notification._id)}`;

    try {
      await this.whatsappService.sendMessage(jid, notification.message.body, requestId);

      notification.status = 'sent';
      notification.sentAt = new Date();
      await notification.save();

      this.logger.info(
        { notificationId: String(notification._id), phone: notification.recipient.phone },
        'Notification sent',
      );
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        { notificationId: String(notification._id), error: errorMsg },
        'Failed to send notification',
      );

      notification.retryCount += 1;
      if (notification.retryCount >= MAX_RETRIES) {
        await this.markFailed(notification, errorMsg);
      } else {
        notification.status = 'pending';
        await notification.save();
        this.queue.push(notification);
        this.sortByPriority();
      }
      return false;
    }
  }

  private async markFailed(notification: INotification, reason: string): Promise<void> {
    notification.status = 'failed';
    notification.failedAt = new Date();
    notification.failReason = reason;
    await notification.save();
  }

  startProcessing(intervalMs: number = DEFAULT_PROCESS_INTERVAL_MS): void {
    if (this.intervalId) return;
    this.processing = true;
    this.intervalId = setInterval(async () => {
      if (!this.processing) return;
      await this.processNext();
    }, intervalMs);
    this.logger.info({ intervalMs }, 'Queue processing started');
  }

  stopProcessing(): void {
    this.processing = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.logger.info('Queue processing stopped');
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getQueueStatus(): QueueStatus {
    return {
      pending: this.queue.filter((n) => n.status === 'pending').length,
      queued: this.queue.filter((n) => n.status === 'queued').length,
      sent: this.queue.filter((n) => n.status === 'sent').length,
      failed: this.queue.filter((n) => n.status === 'failed').length,
      processing: this.processing,
    };
  }
}
