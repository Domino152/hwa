import type { AssignmentRecord, AssignmentSubmissionRecord, AssignmentStatus } from './types.js';

export interface IAssignmentRepository {
  create(record: Omit<AssignmentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssignmentRecord>;
  findById(id: string): Promise<AssignmentRecord | null>;
  findBySubject(subject: string, department: string, semester: number, academicYear: string): Promise<AssignmentRecord[]>;
  findByFaculty(createdBy: string, status?: AssignmentStatus): Promise<AssignmentRecord[]>;
  findPublished(department: string, semester: number, academicYear: string): Promise<AssignmentRecord[]>;
  findOverdue(department: string, semester: number, academicYear: string): Promise<AssignmentRecord[]>;
  update(id: string, update: Partial<AssignmentRecord>): Promise<AssignmentRecord | null>;
  updateStatus(id: string, status: AssignmentStatus): Promise<AssignmentRecord | null>;
  delete(id: string): Promise<boolean>;
}

export interface IAssignmentSubmissionRepository {
  create(record: Omit<AssignmentSubmissionRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssignmentSubmissionRecord>;
  findById(id: string): Promise<AssignmentSubmissionRecord | null>;
  findByAssignment(assignmentId: string): Promise<AssignmentSubmissionRecord[]>;
  findByStudent(studentId: string): Promise<AssignmentSubmissionRecord[]>;
  findByStudentAssignment(assignmentId: string, studentId: string): Promise<AssignmentSubmissionRecord | null>;
  findByStudentSubject(studentId: string, subject: string): Promise<AssignmentSubmissionRecord[]>;
  update(id: string, update: Partial<Omit<AssignmentSubmissionRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AssignmentSubmissionRecord | null>;
  grade(id: string, marks: number, grade: string, feedback: string | null, gradedBy: string): Promise<AssignmentSubmissionRecord | null>;
  returnSubmission(id: string): Promise<AssignmentSubmissionRecord | null>;
  delete(id: string): Promise<boolean>;
  getSubmissionStats(assignmentId: string): Promise<{
    totalSubmissions: number;
    onTime: number;
    late: number;
    graded: number;
    ungraded: number;
    averageMarks: number;
    highestMarks: number;
    lowestMarks: number;
  }>;
}