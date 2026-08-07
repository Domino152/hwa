import { Router } from 'express';
import { studentController } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../middleware/async-handler.js';

const router = Router();

router.get(
  '/search',
  authenticate,
  asyncHandler(studentController.searchStudents),
);

router.get(
  '/phone/:phone',
  authenticate,
  asyncHandler(studentController.getByPhone),
);

router.get(
  '/:studentId/profile',
  authenticate,
  asyncHandler(studentController.getProfile),
);

export default router;
