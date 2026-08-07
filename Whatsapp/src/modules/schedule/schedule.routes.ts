import { Router } from 'express';
import { ScheduleController } from './schedule.controller.js';
import { scheduleService } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { createScheduleSchema, bulkScheduleSchema, scheduleQuerySchema } from './schedule.schemas.js';

const scheduleController = new ScheduleController(scheduleService);

const router = Router();

router.get(
  '/day',
  authenticate,
  validate(scheduleQuerySchema, 'query'),
  asyncHandler(scheduleController.getByDay),
);

router.get(
  '/week',
  authenticate,
  validate(scheduleQuerySchema, 'query'),
  asyncHandler(scheduleController.getByWeek),
);

router.get(
  '/subjects',
  authenticate,
  asyncHandler(scheduleController.getSubjects),
);

router.post(
  '/',
  authenticate,
  validate(createScheduleSchema),
  asyncHandler(scheduleController.create),
);

router.post(
  '/bulk',
  authenticate,
  validate(bulkScheduleSchema),
  asyncHandler(scheduleController.bulkCreate),
);

router.delete(
  '/day',
  authenticate,
  asyncHandler(scheduleController.deleteByDay),
);

export default router;
