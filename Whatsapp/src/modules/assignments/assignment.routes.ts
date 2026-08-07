import { Router } from 'express';
import { AssignmentController } from './assignment.controller.js';
import { assignmentService } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../middleware/async-handler.js';

const assignmentController = new AssignmentController(assignmentService);

const router = Router();

// ============================================================
// ASSIGNMENT CRUD
// ============================================================

router.post(
  '/',
  authenticate,
  asyncHandler(assignmentController.createAssignment),
);

router.get(
  '/by-subject',
  authenticate,
  asyncHandler(assignmentController.getAssignmentsBySubject),
);

router.get(
  '/published',
  authenticate,
  asyncHandler(assignmentController.getPublishedAssignments),
);

router.get(
  '/overdue',
  authenticate,
  asyncHandler(assignmentController.getOverdueAssignments),
);

router.get(
  '/faculty/:facultyId',
  authenticate,
  asyncHandler(assignmentController.getAssignmentsByFaculty),
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(assignmentController.getAssignmentById),
);

router.put(
  '/:id',
  authenticate,
  asyncHandler(assignmentController.updateAssignment),
);

router.post(
  '/:id/publish',
  authenticate,
  asyncHandler(assignmentController.publishAssignment),
);

router.post(
  '/:id/close',
  authenticate,
  asyncHandler(assignmentController.closeAssignment),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(assignmentController.deleteAssignment),
);

// ============================================================
// SUBMISSIONS
// ============================================================

router.post(
  '/submissions',
  authenticate,
  asyncHandler(assignmentController.submitAssignment),
);

router.get(
  '/:id/submissions',
  authenticate,
  asyncHandler(assignmentController.getSubmissionsByAssignment),
);

router.get(
  '/:id/submissions/:studentId',
  authenticate,
  asyncHandler(assignmentController.getStudentSubmission),
);

router.get(
  '/:id/stats',
  authenticate,
  asyncHandler(assignmentController.getSubmissionStats),
);

router.get(
  '/submissions/student/:studentId',
  authenticate,
  asyncHandler(assignmentController.getSubmissionsByStudent),
);

router.delete(
  '/submissions/:id',
  authenticate,
  asyncHandler(assignmentController.deleteSubmission),
);

// ============================================================
// GRADING
// ============================================================

router.post(
  '/submissions/:id/grade',
  authenticate,
  asyncHandler(assignmentController.gradeSubmission),
);

router.post(
  '/submissions/:id/return',
  authenticate,
  asyncHandler(assignmentController.returnSubmission),
);

export default router;