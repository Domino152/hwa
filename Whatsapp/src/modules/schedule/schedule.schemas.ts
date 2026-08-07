import { z } from 'zod';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const createScheduleSchema = z.object({
  department: z.string().min(1),
  year: z.number().int().min(1).max(4),
  section: z.string().min(1).max(5),
  dayOfWeek: z.enum(DAYS_OF_WEEK),
  timeSlot: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/),
  subject: z.string().min(1).max(100),
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
  dayOfWeek: z.enum(DAYS_OF_WEEK).optional(),
});

export const deleteScheduleSchema = z.object({
  department: z.string().min(1),
  year: z.coerce.number().int().min(1).max(4),
  section: z.string().min(1),
  dayOfWeek: z.enum(DAYS_OF_WEEK),
});
