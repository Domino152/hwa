import type { Request, Response } from 'express';
import { AssignmentService } from './assignment.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/errors.js';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  gradeSubmissionSchema,
  submitAssignmentSchema,
} from './assignment.schemas.js';

export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  // ============================================================
  // ASSIGNMENT CRUD
  // ============================================================

  createAssignment = async (req: Request, res: Response): Promise<void> => {
    const parsed = createAssignmentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const record = await this.assignmentService.createAssignment({
      ...parsed.data,
      attachmentUrl: parsed.data.attachmentUrl ?? null,
      attachmentName: parsed.data.attachmentName ?? null,
    });
    sendSuccess(res, record, 201);
  };

  getAssignmentById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const record = await this.assignmentService.getAssignmentById(id);
    sendSuccess(res, record);
  };

  getAssignmentsBySubject = async (req: Request, res: Response): Promise<void> => {
    const subject = String(req.query.subject);
    const department = String(req.query.department);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const records = await this.assignmentService.getAssignmentsBySubject(subject, department, semester, academicYear);
    sendSuccess(res, { assignments: records, total: records.length });
  };

  getAssignmentsByFaculty = async (req: Request, res: Response): Promise<void> => {
    const facultyId = String(req.params.facultyId);
    const status = req.query.status ? String(req.query.status) as 'draft' | 'published' | 'closed' : undefined;
    const records = await this.assignmentService.getAssignmentsByFaculty(facultyId, status);
    sendSuccess(res, { assignments: records, total: records.length });
  };

  getPublishedAssignments = async (req: Request, res: Response): Promise<void> => {
    const department = String(req.query.department);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const records = await this.assignmentService.getPublishedAssignments(department, semester, academicYear);
    sendSuccess(res, { assignments: records, total: records.length });
  };

  getOverdueAssignments = async (req: Request, res: Response): Promise<void> => {
    const department = String(req.query.department);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const records = await this.assignmentService.getOverdueAssignments(department, semester, academicYear);
    sendSuccess(res, { assignments: records, total: records.length });
  };

  updateAssignment = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = updateAssignmentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const record = await this.assignmentService.updateAssignment(id, {
      ...parsed.data,
      attachmentUrl: parsed.data.attachmentUrl ?? null,
      attachmentName: parsed.data.attachmentName ?? null,
    });
    sendSuccess(res, record);
  };

  publishAssignment = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const record = await this.assignmentService.publishAssignment(id);
    sendSuccess(res, record);
  };

  closeAssignment = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const record = await this.assignmentService.closeAssignment(id);
    sendSuccess(res, record);
  };

  deleteAssignment = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    await this.assignmentService.deleteAssignment(id);
    sendSuccess(res, { deleted: true });
  };

  // ============================================================
  // SUBMISSIONS
  // ============================================================

  submitAssignment = async (req: Request, res: Response): Promise<void> => {
    const parsed = submitAssignmentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const result = await this.assignmentService.submitAssignment({
      ...parsed.data,
      fileUrl: parsed.data.fileUrl ?? null,
      fileName: parsed.data.fileName ?? null,
    });
    sendSuccess(res, result, 201);
  };

  getSubmissionById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const record = await this.assignmentService.getSubmissionById(id);
    sendSuccess(res, record);
  };

  getSubmissionsByAssignment = async (req: Request, res: Response): Promise<void> => {
    const assignmentId = String(req.params.id);
    const records = await this.assignmentService.getSubmissionsByAssignment(assignmentId);
    sendSuccess(res, { submissions: records, total: records.length });
  };

  getSubmissionsByStudent = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const records = await this.assignmentService.getSubmissionsByStudent(studentId);
    sendSuccess(res, { submissions: records, total: records.length });
  };

  getStudentSubmission = async (req: Request, res: Response): Promise<void> => {
    const assignmentId = String(req.params.id);
    const studentId = String(req.params.studentId);
    const record = await this.assignmentService.getStudentSubmission(assignmentId, studentId);
    sendSuccess(res, { submission: record, hasData: !!record });
  };

  deleteSubmission = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    await this.assignmentService.deleteSubmission(id);
    sendSuccess(res, { deleted: true });
  };

  // ============================================================
  // GRADING
  // ============================================================

  gradeSubmission = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = gradeSubmissionSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const record = await this.assignmentService.gradeSubmission(id, {
      marks: parsed.data.marks,
      grade: parsed.data.grade ?? '',
      feedback: parsed.data.feedback ?? null,
      gradedBy: parsed.data.gradedBy,
    });
    sendSuccess(res, record);
  };

  returnSubmission = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const record = await this.assignmentService.returnSubmission(id);
    sendSuccess(res, record);
  };

  // ============================================================
  // STATS
  // ============================================================

  getSubmissionStats = async (req: Request, res: Response): Promise<void> => {
    const assignmentId = String(req.params.id);
    const stats = await this.assignmentService.getSubmissionStats(assignmentId);
    sendSuccess(res, stats);
  };
}