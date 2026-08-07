import { Router } from 'express';
import { parentController } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../middleware/async-handler.js';

const router = Router();

router.get(
  '/linked-students',
  authenticate,
  asyncHandler(parentController.getLinkedStudents),
);

router.get(
  '/student/:studentId',
  authenticate,
  asyncHandler(parentController.getStudentProfile),
);

export default router;
