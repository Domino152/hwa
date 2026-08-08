import { MongoAssignmentRepository } from '../../repositories/mongodb/assignment.repository.js';
import { AssignmentService } from './assignment.service.js';

const assignmentRepo = new MongoAssignmentRepository();

export const assignmentService = new AssignmentService(assignmentRepo);

export { AssignmentService } from './assignment.service.js';
export { AssignmentController } from './assignment.controller.js';
export { computeLatePenalty, computeGrade } from './assignment.service.js';
