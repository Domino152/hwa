import type { Request, Response } from 'express';
import { NotificationService } from './notification.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import type { NotificationType, NotificationStatus } from '../../database/models/Notification.js';

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  getNotifications = async (req: Request, res: Response): Promise<void> => {
    const filter = {
      studentId: req.query.studentId as string | undefined,
      userId: req.query.userId as string | undefined,
      type: req.query.type as NotificationType | undefined,
      status: req.query.status as NotificationStatus | undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    };

    const result = await this.notificationService.getNotifications(filter);
    sendSuccess(res, {
      notifications: result.notifications.map((n) => ({
        id: String(n._id),
        type: n.type,
        recipient: n.recipient,
        message: n.message,
        status: n.status,
        priority: n.priority,
        scheduledFor: n.scheduledFor,
        sentAt: n.sentAt,
        createdAt: n.createdAt,
      })),
      total: result.total,
      page: filter.page,
      limit: filter.limit,
    });
  };

  getNotificationById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const notification = await this.notificationService.getNotificationById(id);
    if (!notification) {
      sendSuccess(res, { error: 'Notification not found' }, 404);
      return;
    }
    sendSuccess(res, {
      id: String(notification._id),
      type: notification.type,
      recipient: notification.recipient,
      message: notification.message,
      status: notification.status,
      priority: notification.priority,
      scheduledFor: notification.scheduledFor,
      sentAt: notification.sentAt,
      failedAt: notification.failedAt,
      failReason: notification.failReason,
      retryCount: notification.retryCount,
      reference: notification.reference,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    });
  };

  getStats = async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.notificationService.getNotificationStats();
    sendSuccess(res, stats);
  };

  getQueueStatus = async (_req: Request, res: Response): Promise<void> => {
    const status = this.notificationService.queue.getQueueStatus();
    sendSuccess(res, status);
  };
}
