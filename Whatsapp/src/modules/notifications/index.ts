import { NotificationService } from './notification.service.js';

export const notificationService = new NotificationService();

export { NotificationService } from './notification.service.js';
export { NotificationQueue } from './notification-queue.js';
export type { CreateNotificationInput, NotificationFilter, NotificationStats } from './notification.service.js';
export type { QueueStatus } from './notification-queue.js';
export type {
  NotificationType,
  NotificationStatus,
  NotificationPriority,
} from '../../database/models/Notification.js';
export {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
} from './notification.constants.js';
