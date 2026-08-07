import { z } from 'zod';

export const createSubjectSchema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  name: z.string().min(1).max(100),
  department: z.string().min(1),
  semester: z.number().int().min(1).max(8),
  credits: z.number().int().min(1).max(6),
  type: z.enum(['theory', 'lab', 'elective']),
  faculty: z.string().min(1).max(100).default('TBA'),
  prerequisites: z.array(z.string().min(1).max(20).toUpperCase()).max(10).default([]),
  isActive: z.boolean().default(true),
});

export const updateSubjectSchema = z.object({
  code: z.string().min(2).max(20).toUpperCase().optional(),
  name: z.string().min(1).max(100).optional(),
  department: z.string().min(1).optional(),
  semester: z.number().int().min(1).max(8).optional(),
  credits: z.number().int().min(1).max(6).optional(),
  type: z.enum(['theory', 'lab', 'elective']).optional(),
  faculty: z.string().min(1).max(100).optional(),
  prerequisites: z.array(z.string().min(1).max(20).toUpperCase()).max(10).optional(),
  isActive: z.boolean().optional(),
});

export const subjectQuerySchema = z.object({
  department: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  search: z.string().optional(),
  faculty: z.string().optional(),
});

export const subjectResultsQuerySchema = z.object({
  semester: z.coerce.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});
