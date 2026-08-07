import { Router } from 'express';
import { AttendanceController } from './attendance.controller.js';
import { attendanceService } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import {
  createAttendanceSchema,
  updateAttendanceSchema,
  bulkAttendanceSchema,
} from './attendance.schemas.js';

const attendanceController = new AttendanceController(attendanceService);

const router = Router();

router.get(
  '/student/:studentId',
  authenticate,
  asyncHandler(attendanceController.getByStudentId),
);

router.get(
  '/student/:studentId/subject/:subject',
  authenticate,
  asyncHandler(attendanceController.getByStudentAndSubject),
);

router.get(
  '/student/:studentId/semester',
  authenticate,
  asyncHandler(attendanceController.getByStudentAndSemester),
);

router.get(
  '/department/stats',
  authenticate,
  asyncHandler(attendanceController.getDepartmentStats),
);

router.post(
  '/',
  authenticate,
  validate(createAttendanceSchema),
  asyncHandler(attendanceController.create),
);

router.put(
  '/student/:studentId/subject/:subject',
  authenticate,
  validate(updateAttendanceSchema),
  asyncHandler(attendanceController.update),
);

router.post(
  '/bulk',
  authenticate,
  validate(bulkAttendanceSchema),
  asyncHandler(attendanceController.bulkCreate),
);

export default router;
