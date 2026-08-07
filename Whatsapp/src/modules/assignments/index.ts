import { MongoAssignmentRepository } from '../../repositories/mongodb/assignment.repository.js';
import { MongoAssignmentSubmissionRepository } from '../../repositories/mongodb/assignment-submission.repository.js';
import { AssignmentService } from './assignment.service.js';

const assignmentRepo = new MongoAssignmentRepository();
const submissionRepo = new MongoAssignmentSubmissionRepository();

export const assignmentService = new AssignmentService(assignmentRepo, submissionRepo);

export { AssignmentService } from './assignment.service.js';
export { AssignmentController } from './assignment.controller.js';
export { computeLatePenalty, computeGrade } from './assignment.service.js';