import type {
  IAssignmentRepository,
  IAssignmentSubmissionRepository,
} from '../../repositories/assignment.repository.js';
import type { IUserRepository } from '../../repositories/user.repository.js';
import type {
  AssignmentRecord,
  AssignmentSubmissionRecord,
  AssignmentStatus,
} from '../../repositories/types.js';
import { NotFoundError, ValidationError } from '../../shared/utils/errors.js';

export interface CreateAssignmentInput {
  title: string;
  description: string;
  subject: string;
  department: string;
  semester: number;
  academicYear: string;
  createdBy: string;
  facultyName: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  dueDate: Date;
  maxMarks: number;
  passingMarks: number;
}

export interface UpdateAssignmentInput {
  title?: string;
  description?: string;
  dueDate?: Date;
  maxMarks?: number;
  passingMarks?: number;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export interface SubmitAssignmentInput {
  assignmentId: string;
  studentId: string;
  studentName: string;
  fileUrl?: string | null;
  fileName?: string | null;
}

export interface GradeSubmissionInput {
  marks: number;
  grade: string;
  feedback?: string | null;
  gradedBy: string;
}

export interface AssignmentSubmissionResult {
  submission: AssignmentSubmissionRecord;
  assignment: AssignmentRecord;
  wasLate: boolean;
  latePenaltyApplied: number;
}

export class AssignmentService {
  constructor(
    private readonly assignmentRepo: IAssignmentRepository,
    private readonly submissionRepo: IAssignmentSubmissionRepository,
    private readonly userRepo?: IUserRepository,
  ) {}

  // ============================================================
  // ASSIGNMENT CRUD
  // ============================================================

  async createAssignment(input: CreateAssignmentInput): Promise<AssignmentRecord> {
    if (input.maxMarks <= 0) throw new ValidationError('maxMarks must be greater than zero');
    if (input.passingMarks > input.maxMarks) throw new ValidationError('passingMarks cannot exceed maxMarks');
    if (input.passingMarks < 0) throw new ValidationError('passingMarks cannot be negative');
    if (input.dueDate <= new Date()) throw new ValidationError('dueDate must be in the future');

    let facultyName = input.facultyName;
    if (this.userRepo) {
      const user = await this.userRepo.findByStudentId(input.createdBy);
      if (user) facultyName = user.fullName;
    }

    return this.assignmentRepo.create({
      ...input,
      facultyName,
      attachmentUrl: input.attachmentUrl ?? null,
      attachmentName: input.attachmentName ?? null,
      status: 'draft',
    });
  }

  async getAssignmentById(id: string): Promise<AssignmentRecord> {
    const record = await this.assignmentRepo.findById(id);
    if (!record) throw new NotFoundError('Assignment');
    return record;
  }

  async getAssignmentsBySubject(subject: string, department: string, semester: number, academicYear: string): Promise<AssignmentRecord[]> {
    return this.assignmentRepo.findBySubject(subject, department, semester, academicYear);
  }

  async getAssignmentsByFaculty(facultyId: string, status?: AssignmentStatus): Promise<AssignmentRecord[]> {
    return this.assignmentRepo.findByFaculty(facultyId, status);
  }

  async getPublishedAssignments(department: string, semester: number, academicYear: string): Promise<AssignmentRecord[]> {
    return this.assignmentRepo.findPublished(department, semester, academicYear);
  }

  async getOverdueAssignments(department: string, semester: number, academicYear: string): Promise<AssignmentRecord[]> {
    return this.assignmentRepo.findOverdue(department, semester, academicYear);
  }

  async updateAssignment(id: string, update: UpdateAssignmentInput): Promise<AssignmentRecord> {
    const existing = await this.assignmentRepo.findById(id);
    if (!existing) throw new NotFoundError('Assignment');
    if (existing.status !== 'draft') {
      throw new ValidationError('Cannot edit a published or closed assignment');
    }
    if (update.maxMarks !== undefined && update.maxMarks <= 0) {
      throw new ValidationError('maxMarks must be greater than zero');
    }
    if (update.passingMarks !== undefined && update.maxMarks !== undefined && update.passingMarks > update.maxMarks) {
      throw new ValidationError('passingMarks cannot exceed maxMarks');
    }
    const updated = await this.assignmentRepo.update(id, update);
    if (!updated) throw new NotFoundError('Assignment');
    return updated;
  }

  async publishAssignment(id: string): Promise<AssignmentRecord> {
    const existing = await this.assignmentRepo.findById(id);
    if (!existing) throw new NotFoundError('Assignment');
    if (existing.status !== 'draft') {
      throw new ValidationError('Only draft assignments can be published');
    }
    const updated = await this.assignmentRepo.updateStatus(id, 'published');
    if (!updated) throw new NotFoundError('Assignment');
    return updated;
  }

  async closeAssignment(id: string): Promise<AssignmentRecord> {
    const existing = await this.assignmentRepo.findById(id);
    if (!existing) throw new NotFoundError('Assignment');
    if (existing.status !== 'published') {
      throw new ValidationError('Only published assignments can be closed');
    }
    const updated = await this.assignmentRepo.updateStatus(id, 'closed');
    if (!updated) throw new NotFoundError('Assignment');
    return updated;
  }

  async deleteAssignment(id: string): Promise<void> {
    const existing = await this.assignmentRepo.findById(id);
    if (!existing) throw new NotFoundError('Assignment');
    if (existing.status === 'published') {
      throw new ValidationError('Cannot delete a published assignment. Close it first.');
    }
    const deleted = await this.assignmentRepo.delete(id);
    if (!deleted) throw new NotFoundError('Assignment');
  }

  // ============================================================
  // SUBMISSIONS
  // ============================================================

  async submitAssignment(input: SubmitAssignmentInput): Promise<AssignmentSubmissionResult> {
    const assignment = await this.assignmentRepo.findById(input.assignmentId);
    if (!assignment) throw new NotFoundError('Assignment');
    if (assignment.status !== 'published') {
      throw new ValidationError('Assignment is not accepting submissions');
    }

    const existing = await this.submissionRepo.findByStudentAssignment(input.assignmentId, input.studentId);
    if (existing && existing.status !== 'returned') {
      throw new ValidationError('You have already submitted this assignment. Resubmit not allowed.');
    }

    const now = new Date();
    const isLate = now > assignment.dueDate;
    const latePenalty = isLate ? computeLatePenalty(assignment.dueDate, now, assignment.maxMarks) : 0;

    let studentName = input.studentName;
    if (this.userRepo) {
      const user = await this.userRepo.findByStudentId(input.studentId);
      if (user) studentName = user.fullName;
    }

    let submission: AssignmentSubmissionRecord;

    if (existing && existing.status === 'returned') {
      const updated = await this.submissionRepo.update(existing.id!, {
        submissionDate: now,
        isLate,
        latePenalty,
        fileUrl: input.fileUrl ?? existing.fileUrl,
        fileName: input.fileName ?? existing.fileName,
        status: 'resubmitted',
        marks: null,
        grade: null,
        feedback: null,
        gradedBy: null,
        gradedAt: null,
      });
      submission = updated!;
    } else {
      submission = await this.submissionRepo.create({
        assignmentId: input.assignmentId,
        studentId: input.studentId,
        studentName,
        submissionDate: now,
        isLate,
        latePenalty,
        fileUrl: input.fileUrl ?? null,
        fileName: input.fileName ?? null,
        status: 'submitted',
        marks: null,
        grade: null,
        feedback: null,
        gradedBy: null,
        gradedAt: null,
      });
    }

    return {
      submission,
      assignment,
      wasLate: isLate,
      latePenaltyApplied: latePenalty,
    };
  }

  async getSubmissionById(id: string): Promise<AssignmentSubmissionRecord> {
    const record = await this.submissionRepo.findById(id);
    if (!record) throw new NotFoundError('Submission');
    return record;
  }

  async getSubmissionsByAssignment(assignmentId: string): Promise<AssignmentSubmissionRecord[]> {
    return this.submissionRepo.findByAssignment(assignmentId);
  }

  async getSubmissionsByStudent(studentId: string): Promise<AssignmentSubmissionRecord[]> {
    return this.submissionRepo.findByStudent(studentId);
  }

  async getStudentSubmission(assignmentId: string, studentId: string): Promise<AssignmentSubmissionRecord | null> {
    return this.submissionRepo.findByStudentAssignment(assignmentId, studentId);
  }

  async deleteSubmission(id: string): Promise<void> {
    const existing = await this.submissionRepo.findById(id);
    if (!existing) throw new NotFoundError('Submission');
    if (existing.status === 'graded') {
      throw new ValidationError('Cannot delete a graded submission');
    }
    const deleted = await this.submissionRepo.delete(id);
    if (!deleted) throw new NotFoundError('Submission');
  }

  // ============================================================
  // GRADING
  // ============================================================

  async gradeSubmission(id: string, input: GradeSubmissionInput): Promise<AssignmentSubmissionRecord> {
    const existing = await this.submissionRepo.findById(id);
    if (!existing) throw new NotFoundError('Submission');

    const assignment = await this.assignmentRepo.findById(existing.assignmentId);
    if (!assignment) throw new NotFoundError('Assignment');

    const effectiveMarks = Math.max(0, input.marks - existing.latePenalty);
    if (effectiveMarks > assignment.maxMarks) {
      throw new ValidationError(`Marks cannot exceed ${assignment.maxMarks}`);
    }

    const grade = input.grade || computeGrade(effectiveMarks, assignment.maxMarks, assignment.passingMarks);

    const graded = await this.submissionRepo.grade(id, effectiveMarks, grade, input.feedback ?? null, input.gradedBy);
    if (!graded) throw new NotFoundError('Submission after grading');
    return graded;
  }

  async returnSubmission(id: string): Promise<AssignmentSubmissionRecord> {
    const existing = await this.submissionRepo.findById(id);
    if (!existing) throw new NotFoundError('Submission');
    if (existing.status !== 'graded') {
      throw new ValidationError('Only graded submissions can be returned');
    }
    const returned = await this.submissionRepo.returnSubmission(id);
    if (!returned) throw new NotFoundError('Submission');
    return returned;
  }

  // ============================================================
  // STATS
  // ============================================================

  async getSubmissionStats(assignmentId: string) {
    return this.submissionRepo.getSubmissionStats(assignmentId);
  }
}

// ============================================================
// HELPERS
// ============================================================

export function computeLatePenalty(dueDate: Date, submissionDate: Date, maxMarks: number): number {
  const diffMs = submissionDate.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 0;
  if (diffDays === 1) return Math.round(maxMarks * 0.1);
  if (diffDays === 2) return Math.round(maxMarks * 0.2);
  if (diffDays <= 7) return Math.round(maxMarks * 0.5);
  return maxMarks;
}

export function computeGrade(marks: number, maxMarks: number, passingMarks: number): string {
  if (marks < passingMarks) return 'F';
  const pct = (marks / maxMarks) * 100;
  if (pct >= 90) return 'S';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  return 'C';
}