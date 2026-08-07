import { Router } from 'express';
import { SubjectController } from './subject.controller.js';
import { subjectService } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { createSubjectSchema, updateSubjectSchema } from './subject.schemas.js';

const subjectController = new SubjectController(subjectService);

const router = Router();

router.get(
  '/',
  asyncHandler(subjectController.getAll),
);

router.get(
  '/code/:code/prerequisites',
  asyncHandler(subjectController.getPrerequisites),
);

router.get(
  '/code/:code/schedule',
  asyncHandler(subjectController.getSchedule),
);

router.get(
  '/code/:code/results',
  asyncHandler(subjectController.getResults),
);

router.get(
  '/code/:code/validate-prerequisites',
  asyncHandler(subjectController.validatePrerequisites),
);

router.get(
  '/code/:code',
  asyncHandler(subjectController.getByCode),
);

router.get(
  '/:id',
  asyncHandler(subjectController.getById),
);

router.post(
  '/',
  authenticate,
  validate(createSubjectSchema),
  asyncHandler(subjectController.create),
);

router.put(
  '/:id',
  authenticate,
  validate(updateSubjectSchema),
  asyncHandler(subjectController.update),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(subjectController.delete),
);

export default router;
