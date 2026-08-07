import { Router } from 'express';
import { ScheduleController } from './schedule.controller.js';
import { scheduleService } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import {
  createScheduleSchema,
  bulkScheduleSchema,
  scheduleQuerySchema,
  dayOfWeekParamSchema,
  deleteScheduleSchema,
  addHolidaySchema,
  holidayQuerySchema,
  removeHolidaySchema,
  currentNextQuerySchema,
} from './schedule.schemas.js';

const scheduleController = new ScheduleController(scheduleService);

const router = Router();

router.get(
  '/today',
  authenticate,
  validate(scheduleQuerySchema, 'query'),
  asyncHandler(scheduleController.getToday),
);

router.get(
  '/tomorrow',
  authenticate,
  validate(scheduleQuerySchema, 'query'),
  asyncHandler(scheduleController.getTomorrow),
);

router.get(
  '/week',
  authenticate,
  validate(scheduleQuerySchema, 'query'),
  asyncHandler(scheduleController.getWeekly),
);

router.get(
  '/current',
  authenticate,
  validate(currentNextQuerySchema, 'query'),
  asyncHandler(scheduleController.getCurrentClass),
);

router.get(
  '/next',
  authenticate,
  validate(currentNextQuerySchema, 'query'),
  asyncHandler(scheduleController.getNextClass),
);

router.get(
  '/day/:dayOfWeek',
  authenticate,
  validate(scheduleQuerySchema, 'query'),
  validate(dayOfWeekParamSchema, 'params'),
  asyncHandler(scheduleController.getByDay),
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
  '/day/:dayOfWeek',
  authenticate,
  validate(deleteScheduleSchema, 'query'),
  asyncHandler(scheduleController.deleteByDay),
);

router.get(
  '/holidays',
  authenticate,
  validate(holidayQuerySchema, 'query'),
  asyncHandler(scheduleController.getHolidayOverrides),
);

router.post(
  '/holidays',
  authenticate,
  validate(addHolidaySchema),
  asyncHandler(scheduleController.addHolidayOverride),
);

router.delete(
  '/holidays',
  authenticate,
  validate(removeHolidaySchema, 'body'),
  asyncHandler(scheduleController.removeHolidayOverride),
);

export default router;
