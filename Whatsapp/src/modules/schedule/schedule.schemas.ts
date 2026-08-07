import { z } from 'zod';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const createScheduleSchema = z.object({
  department: z.string().min(1).max(10),
  year: z.number().int().min(1).max(4),
  section: z.string().min(1).max(5),
  dayOfWeek: z.enum(DAYS_OF_WEEK),
  periodNumber: z.number().int().min(1).max(10),
  timeSlot: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/),
  subject: z.string().min(1).max(100),
  faculty: z.string().min(1).max(100).default('TBA'),
  room: z.string().min(1).max(50),
  type: z.enum(['lecture', 'lab', 'tutorial']),
  semester: z.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const bulkScheduleSchema = z.object({
  schedules: z.array(createScheduleSchema).min(1).max(200),
});

export const scheduleQuerySchema = z.object({
  department: z.string().min(1),
  year: z.coerce.number().int().min(1).max(4),
  section: z.string().min(1),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
});

export const dayOfWeekParamSchema = z.object({
  dayOfWeek: z.enum(DAYS_OF_WEEK),
});

export const deleteScheduleSchema = z.object({
  department: z.string().min(1),
  year: z.coerce.number().int().min(1).max(4),
  section: z.string().min(1),
});

export const addHolidaySchema = z.object({
  department: z.string().min(1).max(10),
  year: z.number().int().min(1).max(4),
  section: z.string().min(1).max(5),
  date: z.coerce.date(),
  reason: z.string().min(1).max(200),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const holidayQuerySchema = z.object({
  department: z.string().min(1),
  year: z.coerce.number().int().min(1).max(4),
  section: z.string().min(1),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const removeHolidaySchema = z.object({
  department: z.string().min(1),
  year: z.coerce.number().int().min(1).max(4),
  section: z.string().min(1),
  date: z.coerce.date(),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const currentNextQuerySchema = z.object({
  department: z.string().min(1),
  year: z.coerce.number().int().min(1).max(4),
  section: z.string().min(1),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});
