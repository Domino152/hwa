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
  dailyAttendanceSchema,
  bulkDailyAttendanceSchema,
  dailyDateRangeQuerySchema,
} from './attendance.schemas.js';

const attendanceController = new AttendanceController(attendanceService);

const router = Router();

// --- Daily Attendance (specific routes first) ---

router.get(
  '/daily/date-range',
  validate(dailyDateRangeQuerySchema, 'query'),
  asyncHandler(attendanceController.getDailyByDateRange),
);

router.get(
  '/daily/faculty/:facultyId',
  authenticate,
  asyncHandler(attendanceController.getFacultyMarkedRecords),
);

router.get(
  '/daily/student/:studentId/date',
  authenticate,
  asyncHandler(attendanceController.getDailyByStudentAndDate),
);

router.get(
  '/daily/student/:studentId/subject/:subject',
  authenticate,
  asyncHandler(attendanceController.getDailyByStudentAndSubject),
);

router.get(
  '/daily/student/:studentId/semester',
  authenticate,
  asyncHandler(attendanceController.getDailyByStudentAndSemester),
);

router.post(
  '/daily',
  authenticate,
  validate(dailyAttendanceSchema),
  asyncHandler(attendanceController.markDaily),
);

router.post(
  '/daily/bulk',
  validate(bulkDailyAttendanceSchema),
  asyncHandler(attendanceController.markBulkDaily),
);

// --- Reports ---

router.get(
  '/report/monthly/:studentId',
  authenticate,
  asyncHandler(attendanceController.getMonthlyReport),
);

router.get(
  '/report/semester/:studentId',
  authenticate,
  asyncHandler(attendanceController.getSemesterReport),
);

// --- Analytics & Summary ---

router.get(
  '/analytics/:studentId',
  authenticate,
  asyncHandler(attendanceController.getAnalytics),
);

router.get(
  '/summary/:studentId',
  authenticate,
  asyncHandler(attendanceController.getSummary),
);

// --- Below-75% Detection ---

router.get(
  '/below-threshold',
  authenticate,
  asyncHandler(attendanceController.getBelowThreshold),
);

router.post(
  '/detect-alerts',
  authenticate,
  asyncHandler(attendanceController.detectAndAlert),
);

// --- History ---

router.get(
  '/history/:studentId',
  authenticate,
  asyncHandler(attendanceController.getHistory),
);

// --- Student Lookup ---

router.get(
  '/lookup/:studentId',
  authenticate,
  asyncHandler(attendanceController.lookupStudent),
);

// --- Aggregate (existing) ---

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

router.get(
  '/student/:studentId',
  authenticate,
  asyncHandler(attendanceController.getByStudentId),
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
