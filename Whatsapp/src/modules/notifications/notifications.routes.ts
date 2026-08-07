import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { notificationService } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { createGeneralAnnouncementSchema } from './notification.schemas.js';

const notificationController = new NotificationController(notificationService);

const router = Router();

router.get('/', asyncHandler(notificationController.getNotifications));
router.get('/stats', asyncHandler(notificationController.getStats));
router.get('/queue/status', asyncHandler(notificationController.getQueueStatus));
router.get('/pending', authenticate, asyncHandler(notificationController.getPendingNotifications));
router.get('/:id', asyncHandler(notificationController.getNotificationById));

router.post(
  '/general-announcement',
  authenticate,
  validate(createGeneralAnnouncementSchema),
  asyncHandler(notificationController.createGeneralAnnouncement),
);

router.post(
  '/holiday-notice',
  authenticate,
  asyncHandler(notificationController.createHolidayNotice),
);

router.post(
  '/:id/mark-sent',
  authenticate,
  asyncHandler(notificationController.markAsSent),
);

router.post(
  '/:id/mark-failed',
  authenticate,
  asyncHandler(notificationController.markAsFailed),
);

router.post(
  '/:id/cancel',
  authenticate,
  asyncHandler(notificationController.cancelNotification),
);

export default router;
