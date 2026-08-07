import { z } from 'zod';

export const createAttendanceSchema = z.object({
  studentId: z.string().min(1),
  subject: z.string().min(1).max(100),
  totalClasses: z.number().int().min(1),
  attendedClasses: z.number().int().min(0),
  semester: z.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const updateAttendanceSchema = z.object({
  totalClasses: z.number().int().min(1).optional(),
  attendedClasses: z.number().int().min(0).optional(),
});

export const attendanceQuerySchema = z.object({
  studentId: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  department: z.string().optional(),
});

export const attendanceParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid attendance ID'),
});

export const bulkAttendanceSchema = z.object({
  records: z.array(createAttendanceSchema).min(1).max(100),
});
