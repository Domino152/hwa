import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AssignmentService,
  computeLatePenalty,
  computeGrade,
} from '../../src/modules/assignments/assignment.service.js';
import type {
  IAssignmentRepository,
  IAssignmentSubmissionRepository,
} from '../../src/repositories/assignment.repository.js';
import type { IUserRepository } from '../../src/repositories/user.repository.js';
import type {
  AssignmentRecord,
  AssignmentSubmissionRecord,
} from '../../src/repositories/types.js';

function makeAssignment(overrides: Partial<AssignmentRecord> = {}): AssignmentRecord {
  return {
    id: '507f1f77bcf86cd799439011',
    title: 'DBMS Assignment 1',
    description: 'Normalize the given schema to 3NF',
    subject: 'DBMS',
    department: 'CSE',
    semester: 4,
    academicYear: '2025-26',
    createdBy: 'F001',
    facultyName: 'Dr. Smith',
    attachmentUrl: null,
    attachmentName: null,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    maxMarks: 100,
    passingMarks: 40,
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSubmission(overrides: Partial<AssignmentSubmissionRecord> = {}): AssignmentSubmissionRecord {
  return {
    id: '507f1f77bcf86cd799439012',
    assignmentId: '507f1f77bcf86cd799439011',
    studentId: '22CSE001',
    studentName: 'Arjun',
    submissionDate: new Date(),
    isLate: false,
    latePenalty: 0,
    fileUrl: null,
    fileName: null,
    status: 'submitted',
    marks: null,
    grade: null,
    feedback: null,
    gradedBy: null,
    gradedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('computeLatePenalty', () => {
  it('returns 0 when submitted before due date', () => {
    const due = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const sub = new Date(Date.now() - 1000);
    expect(computeLatePenalty(due, sub, 100)).toBe(0);
  });

  it('returns 10% penalty for 1 day late', () => {
    const due = new Date('2025-01-01T23:59:59');
    const sub = new Date('2025-01-02T23:59:59');
    expect(computeLatePenalty(due, sub, 100)).toBe(10);
  });

  it('returns 20% penalty for 2 days late', () => {
    const due = new Date('2025-01-01T23:59:59');
    const sub = new Date('2025-01-03T23:59:59');
    expect(computeLatePenalty(due, sub, 100)).toBe(20);
  });

  it('returns 50% penalty for 5 days late', () => {
    const due = new Date('2025-01-01T23:59:59');
    const sub = new Date('2025-01-06T23:59:59');
    expect(computeLatePenalty(due, sub, 100)).toBe(50);
  });

  it('returns 100% penalty for 8+ days late', () => {
    const due = new Date('2025-01-01T23:59:59');
    const sub = new Date('2025-01-10T23:59:59');
    expect(computeLatePenalty(due, sub, 100)).toBe(100);
  });
});

describe('computeGrade', () => {
  it('returns S for >= 90%', () => {
    expect(computeGrade(95, 100, 40)).toBe('S');
  });

  it('returns A+ for 80-89%', () => {
    expect(computeGrade(85, 100, 40)).toBe('A+');
  });

  it('returns A for 70-79%', () => {
    expect(computeGrade(75, 100, 40)).toBe('A');
  });

  it('returns B+ for 60-69%', () => {
    expect(computeGrade(65, 100, 40)).toBe('B+');
  });

  it('returns B for 50-59%', () => {
    expect(computeGrade(55, 100, 40)).toBe('B');
  });

  it('returns C for 40-49%', () => {
    expect(computeGrade(45, 100, 40)).toBe('C');
  });

  it('returns F for below passing', () => {
    expect(computeGrade(30, 100, 40)).toBe('F');
  });
});

describe('AssignmentService', () => {
  let assignmentRepo: IAssignmentRepository;
  let submissionRepo: IAssignmentSubmissionRepository;
  let userRepo: IUserRepository;
  let service: AssignmentService;

  beforeEach(() => {
    assignmentRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findBySubject: vi.fn(),
      findByFaculty: vi.fn(),
      findPublished: vi.fn(),
      findOverdue: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    };

    submissionRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByAssignment: vi.fn(),
      findByStudent: vi.fn(),
      findByStudentAssignment: vi.fn(),
      findByStudentSubject: vi.fn(),
      update: vi.fn(),
      grade: vi.fn(),
      returnSubmission: vi.fn(),
      delete: vi.fn(),
      getSubmissionStats: vi.fn(),
    };

    userRepo = {
      findByPhone: vi.fn(),
      findByStudentId: vi.fn().mockResolvedValue({ fullName: 'Arjun Sharma' }),
      findParentByStudentId: vi.fn(),
      findById: vi.fn(),
      findStudentsByClass: vi.fn(),
      findLinkedStudents: vi.fn(),
      updateWhatsAppNumber: vi.fn(),
    };

    service = new AssignmentService(assignmentRepo, submissionRepo, userRepo);
  });

  // ============================================================
  // ASSIGNMENT CRUD
  // ============================================================

  describe('createAssignment', () => {
    it('creates an assignment with computed faculty name', async () => {
      const assignment = makeAssignment({ status: 'draft' });
      vi.mocked(assignmentRepo.create).mockResolvedValue(assignment);

      const result = await service.createAssignment({
        title: 'DBMS Assignment 1',
        description: 'Normalize to 3NF',
        subject: 'DBMS',
        department: 'CSE',
        semester: 4,
        academicYear: '2025-26',
        createdBy: 'F001',
        facultyName: 'Dr. Smith',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxMarks: 100,
        passingMarks: 40,
      });
      expect(result.status).toBe('draft');
    });

    it('throws when maxMarks is zero', async () => {
      await expect(
        service.createAssignment({
          title: 'Test', description: 'Test', subject: 'CS', department: 'CSE',
          semester: 1, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
          dueDate: new Date(Date.now() + 86400000), maxMarks: 0, passingMarks: 0,
        }),
      ).rejects.toThrow('maxMarks must be greater than zero');
    });

    it('throws when passingMarks exceeds maxMarks', async () => {
      await expect(
        service.createAssignment({
          title: 'Test', description: 'Test', subject: 'CS', department: 'CSE',
          semester: 1, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
          dueDate: new Date(Date.now() + 86400000), maxMarks: 50, passingMarks: 60,
        }),
      ).rejects.toThrow('passingMarks cannot exceed maxMarks');
    });

    it('throws when dueDate is in the past', async () => {
      await expect(
        service.createAssignment({
          title: 'Test', description: 'Test', subject: 'CS', department: 'CSE',
          semester: 1, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
          dueDate: new Date('2020-01-01'), maxMarks: 100, passingMarks: 40,
        }),
      ).rejects.toThrow('dueDate must be in the future');
    });
  });

  describe('updateAssignment', () => {
    it('updates a draft assignment', async () => {
      const existing = makeAssignment({ status: 'draft' });
      const updated = makeAssignment({ status: 'draft', title: 'Updated' });
      vi.mocked(assignmentRepo.findById).mockResolvedValue(existing);
      vi.mocked(assignmentRepo.update).mockResolvedValue(updated);

      const result = await service.updateAssignment(existing.id!, { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('throws when editing a published assignment', async () => {
      const existing = makeAssignment({ status: 'published' });
      vi.mocked(assignmentRepo.findById).mockResolvedValue(existing);

      await expect(service.updateAssignment(existing.id!, { title: 'No' })).rejects.toThrow('Cannot edit');
    });
  });

  describe('publishAssignment', () => {
    it('publishes a draft assignment', async () => {
      const existing = makeAssignment({ status: 'draft' });
      const published = makeAssignment({ status: 'published' });
      vi.mocked(assignmentRepo.findById).mockResolvedValue(existing);
      vi.mocked(assignmentRepo.updateStatus).mockResolvedValue(published);

      const result = await service.publishAssignment(existing.id!);
      expect(result.status).toBe('published');
    });

    it('throws when publishing already published', async () => {
      const existing = makeAssignment({ status: 'published' });
      vi.mocked(assignmentRepo.findById).mockResolvedValue(existing);

      await expect(service.publishAssignment(existing.id!)).rejects.toThrow('Only draft');
    });
  });

  describe('closeAssignment', () => {
    it('closes a published assignment', async () => {
      const existing = makeAssignment({ status: 'published' });
      const closed = makeAssignment({ status: 'closed' });
      vi.mocked(assignmentRepo.findById).mockResolvedValue(existing);
      vi.mocked(assignmentRepo.updateStatus).mockResolvedValue(closed);

      const result = await service.closeAssignment(existing.id!);
      expect(result.status).toBe('closed');
    });

    it('throws when closing a draft', async () => {
      const existing = makeAssignment({ status: 'draft' });
      vi.mocked(assignmentRepo.findById).mockResolvedValue(existing);

      await expect(service.closeAssignment(existing.id!)).rejects.toThrow('Only published');
    });
  });

  describe('deleteAssignment', () => {
    it('deletes a draft assignment', async () => {
      const existing = makeAssignment({ status: 'draft' });
      vi.mocked(assignmentRepo.findById).mockResolvedValue(existing);
      vi.mocked(assignmentRepo.delete).mockResolvedValue(true);

      await expect(service.deleteAssignment(existing.id!)).resolves.not.toThrow();
    });

    it('throws when deleting a published assignment', async () => {
      const existing = makeAssignment({ status: 'published' });
      vi.mocked(assignmentRepo.findById).mockResolvedValue(existing);

      await expect(service.deleteAssignment(existing.id!)).rejects.toThrow('Cannot delete');
    });
  });

  // ============================================================
  // SUBMISSIONS
  // ============================================================

  describe('submitAssignment', () => {
    it('submits on time', async () => {
      const assignment = makeAssignment({
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      const submission = makeSubmission();
      vi.mocked(assignmentRepo.findById).mockResolvedValue(assignment);
      vi.mocked(submissionRepo.findByStudentAssignment).mockResolvedValue(null);
      vi.mocked(submissionRepo.create).mockResolvedValue(submission);

      const result = await service.submitAssignment({
        assignmentId: assignment.id!,
        studentId: '22CSE001',
        studentName: 'Arjun',
      });
      expect(result.wasLate).toBe(false);
      expect(result.latePenaltyApplied).toBe(0);
    });

    it('submits late with penalty', async () => {
      const assignment = makeAssignment({
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      });
      const submission = makeSubmission({ isLate: true, latePenalty: 20 });
      vi.mocked(assignmentRepo.findById).mockResolvedValue(assignment);
      vi.mocked(submissionRepo.findByStudentAssignment).mockResolvedValue(null);
      vi.mocked(submissionRepo.create).mockResolvedValue(submission);

      const result = await service.submitAssignment({
        assignmentId: assignment.id!,
        studentId: '22CSE001',
        studentName: 'Arjun',
      });
      expect(result.wasLate).toBe(true);
      expect(result.latePenaltyApplied).toBe(20);
    });

    it('throws when assignment is not published', async () => {
      const assignment = makeAssignment({ status: 'draft' });
      vi.mocked(assignmentRepo.findById).mockResolvedValue(assignment);

      await expect(
        service.submitAssignment({
          assignmentId: assignment.id!,
          studentId: '22CSE001',
          studentName: 'Arjun',
        }),
      ).rejects.toThrow('not accepting submissions');
    });

    it('throws when student already submitted', async () => {
      const assignment = makeAssignment();
      const existing = makeSubmission({ status: 'submitted' });
      vi.mocked(assignmentRepo.findById).mockResolvedValue(assignment);
      vi.mocked(submissionRepo.findByStudentAssignment).mockResolvedValue(existing);

      await expect(
        service.submitAssignment({
          assignmentId: assignment.id!,
          studentId: '22CSE001',
          studentName: 'Arjun',
        }),
      ).rejects.toThrow('already submitted');
    });

    it('allows resubmit when previous was returned', async () => {
      const assignment = makeAssignment();
      const returned = makeSubmission({ status: 'returned' });
      vi.mocked(assignmentRepo.findById).mockResolvedValue(assignment);
      vi.mocked(submissionRepo.findByStudentAssignment).mockResolvedValue(returned);
      vi.mocked(submissionRepo.update).mockResolvedValue(makeSubmission({ status: 'resubmitted' }));

      const result = await service.submitAssignment({
        assignmentId: assignment.id!,
        studentId: '22CSE001',
        studentName: 'Arjun',
      });
      expect(result.submission.status).toBe('resubmitted');
    });
  });

  // ============================================================
  // GRADING
  // ============================================================

  describe('gradeSubmission', () => {
    it('grades and applies late penalty', async () => {
      const submission = makeSubmission({ latePenalty: 10 });
      const graded = makeSubmission({ status: 'graded', marks: 80, grade: 'A' });
      vi.mocked(submissionRepo.findById).mockResolvedValue(submission);
      vi.mocked(assignmentRepo.findById).mockResolvedValue(makeAssignment({ maxMarks: 100, passingMarks: 40 }));
      vi.mocked(submissionRepo.grade).mockResolvedValue(graded);

      const result = await service.gradeSubmission(submission.id!, {
        marks: 90,
        grade: '',
        feedback: 'Good work',
        gradedBy: 'F001',
      });
      expect(result.marks).toBe(80);
      expect(result.status).toBe('graded');
    });

    it('auto-computes grade when not provided', async () => {
      const submission = makeSubmission({ latePenalty: 0 });
      const graded = makeSubmission({ status: 'graded', marks: 95, grade: 'S' });
      vi.mocked(submissionRepo.findById).mockResolvedValue(submission);
      vi.mocked(assignmentRepo.findById).mockResolvedValue(makeAssignment({ maxMarks: 100, passingMarks: 40 }));
      vi.mocked(submissionRepo.grade).mockResolvedValue(graded);

      const result = await service.gradeSubmission(submission.id!, {
        marks: 95,
        grade: '',
        gradedBy: 'F001',
      });
      expect(result.grade).toBe('S');
    });

    it('throws when marks exceed maxMarks', async () => {
      const submission = makeSubmission({ latePenalty: 0 });
      vi.mocked(submissionRepo.findById).mockResolvedValue(submission);
      vi.mocked(assignmentRepo.findById).mockResolvedValue(makeAssignment({ maxMarks: 100, passingMarks: 40 }));

      await expect(
        service.gradeSubmission(submission.id!, { marks: 150, grade: '', gradedBy: 'F001' }),
      ).rejects.toThrow('Marks cannot exceed');
    });

    it('returns submission for re-grading', async () => {
      const submission = makeSubmission({ status: 'graded' });
      const returned = makeSubmission({ status: 'returned' });
      vi.mocked(submissionRepo.findById).mockResolvedValue(submission);
      vi.mocked(submissionRepo.returnSubmission).mockResolvedValue(returned);

      const result = await service.returnSubmission(submission.id!);
      expect(result.status).toBe('returned');
    });

    it('throws when returning non-graded submission', async () => {
      const submission = makeSubmission({ status: 'submitted' });
      vi.mocked(submissionRepo.findById).mockResolvedValue(submission);

      await expect(service.returnSubmission(submission.id!)).rejects.toThrow('Only graded');
    });
  });

  // ============================================================
  // DELETE SUBMISSION
  // ============================================================

  describe('deleteSubmission', () => {
    it('deletes an ungraded submission', async () => {
      const submission = makeSubmission({ status: 'submitted' });
      vi.mocked(submissionRepo.findById).mockResolvedValue(submission);
      vi.mocked(submissionRepo.delete).mockResolvedValue(true);

      await expect(service.deleteSubmission(submission.id!)).resolves.not.toThrow();
    });

    it('throws when deleting a graded submission', async () => {
      const submission = makeSubmission({ status: 'graded' });
      vi.mocked(submissionRepo.findById).mockResolvedValue(submission);

      await expect(service.deleteSubmission(submission.id!)).rejects.toThrow('Cannot delete');
    });
  });

  // ============================================================
  // STATS
  // ============================================================

  describe('getSubmissionStats', () => {
    it('returns submission stats', async () => {
      const stats = {
        totalSubmissions: 10,
        onTime: 8,
        late: 2,
        graded: 5,
        ungraded: 5,
        averageMarks: 72.5,
        highestMarks: 95,
        lowestMarks: 30,
      };
      vi.mocked(submissionRepo.getSubmissionStats).mockResolvedValue(stats);

      const result = await service.getSubmissionStats('507f1f77bcf86cd799439011');
      expect(result.totalSubmissions).toBe(10);
      expect(result.late).toBe(2);
    });
  });
});