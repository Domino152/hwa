import { z } from 'zod';

const academicYearRegex = /^\d{4}-\d{2}$/;

// ============================================================
// ASSIGNMENT
// ============================================================

export const createAssignmentSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(1).max(5000).trim(),
  subject: z.string().min(1).max(100).trim(),
  department: z.string().min(1).max(10).trim(),
  semester: z.number().int().min(1).max(12),
  academicYear: z.string().regex(academicYearRegex),
  createdBy: z.string().min(1),
  facultyName: z.string().min(1).max(100).trim(),
  attachmentUrl: z.string().url().nullable().optional(),
  attachmentName: z.string().max(100).nullable().optional(),
  dueDate: z.coerce.date(),
  maxMarks: z.number().positive(),
  passingMarks: z.number().min(0),
});

export const updateAssignmentSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().min(1).max(5000).trim().optional(),
  dueDate: z.coerce.date().optional(),
  maxMarks: z.number().positive().optional(),
  passingMarks: z.number().min(0).optional(),
  attachmentUrl: z.string().url().nullable().optional(),
  attachmentName: z.string().max(100).nullable().optional(),
});

export const assignmentQuerySchema = z.object({
  subject: z.string().optional(),
  department: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(12).optional(),
  academicYear: z.string().regex(academicYearRegex).optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
});

export const assignmentParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid assignment ID'),
});

export const facultyIdParamsSchema = z.object({
  facultyId: z.string().min(1),
});

// ============================================================
// SUBMISSIONS
// ============================================================

export const submitAssignmentSchema = z.object({
  assignmentId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid assignment ID'),
  studentId: z.string().min(1),
  studentName: z.string().min(1).max(100).trim(),
  fileUrl: z.string().url().nullable().optional(),
  fileName: z.string().max(100).nullable().optional(),
});

export const submissionParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid submission ID'),
});

export const studentIdParamsSchema = z.object({
  studentId: z.string().min(1),
});

// ============================================================
// GRADING
// ============================================================

export const gradeSubmissionSchema = z.object({
  marks: z.number().min(0),
  grade: z.string().max(10).optional(),
  feedback: z.string().max(2000).nullable().optional(),
  gradedBy: z.string().min(1).max(100),
});

// ============================================================
// STATS
// ============================================================

export const statsQuerySchema = z.object({
  assignmentId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid assignment ID'),
});