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

export const dailyAttendanceSchema = z.object({
  studentId: z.string().min(1),
  subject: z.string().min(1).max(100),
  date: z.coerce.date(),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  markedBy: z.string().optional(),
  semester: z.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
  notes: z.string().max(500).optional(),
});

export const bulkDailyAttendanceSchema = z.object({
  records: z.array(dailyAttendanceSchema).min(1).max(200),
});

export const monthlyReportParamsSchema = z.object({
  studentId: z.string().min(1),
});

export const monthlyReportQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2030),
  semester: z.coerce.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const semesterReportParamsSchema = z.object({
  studentId: z.string().min(1),
});

export const semesterReportQuerySchema = z.object({
  semester: z.coerce.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const analyticsParamsSchema = z.object({
  studentId: z.string().min(1),
});

export const analyticsQuerySchema = z.object({
  semester: z.coerce.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const summaryParamsSchema = z.object({
  studentId: z.string().min(1),
});

export const summaryQuerySchema = z.object({
  semester: z.coerce.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const belowThresholdQuerySchema = z.object({
  semester: z.coerce.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
  threshold: z.coerce.number().int().min(0).max(100).optional(),
});

export const detectAlertsQuerySchema = z.object({
  semester: z.coerce.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const historyParamsSchema = z.object({
  studentId: z.string().min(1),
});

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const facultyLookupParamsSchema = z.object({
  facultyId: z.string().min(1),
});

export const facultyLookupQuerySchema = z.object({
  date: z.coerce.date(),
  semester: z.coerce.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const dailyByDateParamsSchema = z.object({
  studentId: z.string().min(1),
});

export const dailyByDateQuerySchema = z.object({
  date: z.coerce.date(),
});

export const dailyBySubjectParamsSchema = z.object({
  studentId: z.string().min(1),
  subject: z.string().min(1),
});

export const dailyBySubjectQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const dailyBySemesterParamsSchema = z.object({
  studentId: z.string().min(1),
});

export const dailyBySemesterQuerySchema = z.object({
  semester: z.coerce.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const dailyDateRangeQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  semester: z.coerce.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});
