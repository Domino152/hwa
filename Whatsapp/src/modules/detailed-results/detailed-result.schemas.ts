import { z } from 'zod';

const positiveInt = z.number().int().min(0);
const maxInt = z.number().min(0);

export const createDetailedResultSchemaObject = z.object({
  studentId: z.string().min(1).max(50),
  subjectCode: z.string().min(1).max(20).transform((s) => s.toUpperCase()),
  semester: z.number().int().min(1).max(12),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
  internalMarks: positiveInt.nullable().optional(),
  internalMax: maxInt.optional(),
  externalMarks: positiveInt.nullable().optional(),
  externalMax: maxInt.optional(),
  assignmentMarks: positiveInt.nullable().optional(),
  assignmentMax: maxInt.optional(),
  labMarks: positiveInt.nullable().optional(),
  labMax: maxInt.optional(),
  credits: z.number().min(0).max(10).optional(),
  isAbsent: z.boolean().optional(),
  remarks: z.string().max(500).nullable().optional(),
});

export const bulkDetailedResultSchema = z.object({
  results: z.array(createDetailedResultSchemaObject).min(1).max(500),
});

export const semesterQuerySchema = z.object({
  semester: z.coerce.number().int().min(1).max(12),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const academicYearQuerySchema = z.object({
  academicYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const subjectCodeParamSchema = z.object({
  subjectCode: z.string().min(1).max(20).transform((s) => s.toUpperCase()),
});

export const studentIdParamSchema = z.object({
  studentId: z.string().min(1).max(50),
});

export const studentSubjectParamSchema = z.object({
  studentId: z.string().min(1).max(50),
  subjectCode: z.string().min(1).max(20),
});

export const publishSchema = z.object({
  semester: z.number().int().min(1).max(12),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});