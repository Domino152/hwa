import { z } from 'zod';

export const createSubjectSchema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  name: z.string().min(1).max(100),
  department: z.string().min(1),
  semester: z.number().int().min(1).max(8),
  credits: z.number().int().min(1).max(6),
  type: z.enum(['theory', 'lab', 'elective']),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  department: z.string().min(1).optional(),
  semester: z.number().int().min(1).max(8).optional(),
  credits: z.number().int().min(1).max(6).optional(),
  type: z.enum(['theory', 'lab', 'elective']).optional(),
  isActive: z.boolean().optional(),
});

export const subjectQuerySchema = z.object({
  department: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  search: z.string().optional(),
});
