import { Router } from 'express';
import { ResultController } from './result.controller.js';
import { resultService } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { createResultSchema, bulkResultSchema } from './result.schemas.js';

const resultController = new ResultController(resultService);

const router = Router();

router.get(
  '/student/:studentId',
  authenticate,
  asyncHandler(resultController.getByStudentId),
);

router.get(
  '/student/:studentId/semester',
  authenticate,
  asyncHandler(resultController.getByStudentAndSemester),
);

router.get(
  '/student/:studentId/exam-type',
  authenticate,
  asyncHandler(resultController.getByExamType),
);

router.get(
  '/student/:studentId/cgpa',
  authenticate,
  asyncHandler(resultController.getCgpa),
);

router.get(
  '/department/stats',
  authenticate,
  asyncHandler(resultController.getDepartmentResults),
);

router.post(
  '/',
  authenticate,
  validate(createResultSchema),
  asyncHandler(resultController.create),
);

router.post(
  '/bulk',
  authenticate,
  validate(bulkResultSchema),
  asyncHandler(resultController.bulkCreate),
);

export default router;
