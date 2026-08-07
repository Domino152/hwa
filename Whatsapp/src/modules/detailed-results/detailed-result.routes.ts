import { Router } from 'express';
import { DetailedResultController } from './detailed-result.controller.js';
import { detailedResultService } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import {
  createDetailedResultSchemaObject,
  bulkDetailedResultSchema,
  semesterQuerySchema,
  academicYearQuerySchema,
  subjectCodeParamSchema,
  studentIdParamSchema,
  studentSubjectParamSchema,
  publishSchema,
} from './detailed-result.schemas.js';

const controller = new DetailedResultController(detailedResultService);

const router = Router();

router.get(
  '/student/:studentId',
  authenticate,
  validate(studentIdParamSchema, 'params'),
  validate(academicYearQuerySchema, 'query'),
  asyncHandler(controller.getByStudent),
);

router.get(
  '/student/:studentId/semester',
  authenticate,
  validate(studentIdParamSchema, 'params'),
  validate(semesterQuerySchema, 'query'),
  asyncHandler(controller.getByStudentSemester),
);

router.get(
  '/student/:studentId/cgpa',
  authenticate,
  validate(studentIdParamSchema, 'params'),
  asyncHandler(controller.getCgpa),
);

router.get(
  '/student/:studentId/semester-gpa',
  authenticate,
  validate(studentIdParamSchema, 'params'),
  validate(semesterQuerySchema, 'query'),
  asyncHandler(controller.getSemesterGpa),
);

router.get(
  '/student/:studentId/subject/:subjectCode',
  authenticate,
  validate(studentSubjectParamSchema, 'params'),
  validate(academicYearQuerySchema, 'query'),
  asyncHandler(controller.getByStudentSubject),
);

router.get(
  '/subject/:subjectCode',
  authenticate,
  validate(subjectCodeParamSchema, 'params'),
  validate(semesterQuerySchema, 'query'),
  asyncHandler(controller.getBySubject),
);

router.get(
  '/subject/:subjectCode/stats',
  authenticate,
  validate(subjectCodeParamSchema, 'params'),
  validate(semesterQuerySchema, 'query'),
  asyncHandler(controller.getSubjectStats),
);

router.post(
  '/student/:studentId/publish',
  authenticate,
  validate(studentIdParamSchema, 'params'),
  validate(publishSchema),
  asyncHandler(controller.publishResults),
);

router.post(
  '/',
  authenticate,
  validate(createDetailedResultSchemaObject),
  asyncHandler(controller.create),
);

router.post(
  '/bulk',
  authenticate,
  validate(bulkDetailedResultSchema),
  asyncHandler(controller.bulkCreate),
);

router.delete(
  '/student/:studentId/subject/:subjectCode',
  authenticate,
  validate(studentSubjectParamSchema, 'params'),
  validate(semesterQuerySchema, 'query'),
  asyncHandler(controller.deleteResult),
);

export default router;