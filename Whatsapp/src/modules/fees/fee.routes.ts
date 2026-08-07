import { Router } from 'express';
import { FeeController } from './fee.controller.js';
import { feeService } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../middleware/async-handler.js';

const feeController = new FeeController(feeService);

const router = Router();

router.get(
  '/student/:studentId',
  authenticate,
  asyncHandler(feeController.getByStudentId),
);

router.get(
  '/student/:studentId/all',
  authenticate,
  asyncHandler(feeController.getByStudentAll),
);

router.get(
  '/student/:studentId/semester',
  authenticate,
  asyncHandler(feeController.getByStudentAndSemester),
);

router.put(
  '/student/:studentId/payment',
  authenticate,
  asyncHandler(feeController.updatePayment),
);

router.get(
  '/overdue',
  authenticate,
  asyncHandler(feeController.getOverdueFees),
);

router.get(
  '/department/summary',
  authenticate,
  asyncHandler(feeController.getDepartmentSummary),
);

export default router;
