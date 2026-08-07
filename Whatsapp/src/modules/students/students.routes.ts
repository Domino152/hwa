import { Router } from 'express';
import { StudentController } from './student.controller.js';
import { studentService } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import {
  createStudentSchema,
  updateStudentSchema,
  studentQuerySchema,
} from './student.schemas.js';

const studentController = new StudentController(studentService);

const router = Router();

router.get(
  '/search',
  authenticate,
  validate(studentQuerySchema, 'query'),
  asyncHandler(studentController.search),
);

router.get(
  '/count',
  authenticate,
  validate(studentQuerySchema, 'query'),
  asyncHandler(studentController.count),
);

router.get(
  '/department/:department',
  authenticate,
  asyncHandler(studentController.getByDepartment),
);

router.get(
  '/class/:department/:semester/:section',
  authenticate,
  asyncHandler(studentController.getByClass),
);

router.get(
  '/student-id/:studentId',
  authenticate,
  asyncHandler(studentController.getByStudentId),
);

router.get(
  '/register/:registerNumber',
  authenticate,
  asyncHandler(studentController.getByRegisterNumber),
);

router.get(
  '/',
  authenticate,
  validate(studentQuerySchema, 'query'),
  asyncHandler(studentController.list),
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(studentController.getById),
);

router.post(
  '/',
  authenticate,
  validate(createStudentSchema),
  asyncHandler(studentController.create),
);

router.put(
  '/:id',
  authenticate,
  validate(updateStudentSchema),
  asyncHandler(studentController.update),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(studentController.delete),
);

export default router;
