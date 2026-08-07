import { z } from 'zod';

export const createResultSchema = z.object({
  studentId: z.string().min(1),
  semester: z.number().int().min(1).max(8),
  subject: z.string().min(1).max(100),
  marksObtained: z.number().min(0),
  totalMarks: z.number().min(1),
  grade: z.string().min(1).max(5),
  cgpa: z.number().min(0).max(10),
  examType: z.enum(['midterm', 'final', 'assignment']),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const bulkResultSchema = z.object({
  results: z.array(createResultSchema).min(1).max(200),
});

export const resultQuerySchema = z.object({
  studentId: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  examType: z.enum(['midterm', 'final', 'assignment']).optional(),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  department: z.string().optional(),
});
