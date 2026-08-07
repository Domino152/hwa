import { Router } from 'express';
import { AnnouncementController } from './announcement.controller.js';
import { announcementService } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { createAnnouncementSchema, updateAnnouncementSchema } from './announcement.schemas.js';

const announcementController = new AnnouncementController(announcementService);

const router = Router();

router.get(
  '/',
  asyncHandler(announcementController.getAll),
);

router.get(
  '/expiring',
  authenticate,
  asyncHandler(announcementController.getExpiringSoon),
);

router.get(
  '/department/:department',
  asyncHandler(announcementController.getByDepartment),
);

router.get(
  '/:id',
  asyncHandler(announcementController.getById),
);

router.post(
  '/',
  authenticate,
  validate(createAnnouncementSchema),
  asyncHandler(announcementController.create),
);

router.put(
  '/:id',
  authenticate,
  validate(updateAnnouncementSchema),
  asyncHandler(announcementController.update),
);

router.post(
  '/:id/publish',
  authenticate,
  asyncHandler(announcementController.publish),
);

router.post(
  '/:id/unpublish',
  authenticate,
  asyncHandler(announcementController.unpublish),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(announcementController.delete),
);

export default router;
