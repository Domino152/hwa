import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { notificationService } from './index.js';
import { asyncHandler } from '../../middleware/async-handler.js';

const notificationController = new NotificationController(notificationService);

const router = Router();

router.get('/', asyncHandler(notificationController.getNotifications));
router.get('/stats', asyncHandler(notificationController.getStats));
router.get('/queue/status', asyncHandler(notificationController.getQueueStatus));
router.get('/:id', asyncHandler(notificationController.getNotificationById));

export default router;
