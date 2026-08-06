import { z } from 'zod';
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES, NOTIFICATION_STATUSES } from './notification.constants.js';

export const getNotificationsSchema = z.object({
  studentId: z.string().optional(),
  userId: z.string().optional(),
  type: z.enum([...NOTIFICATION_TYPES] as [string, ...string[]]).optional(),
  status: z.enum([...NOTIFICATION_STATUSES] as [string, ...string[]]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const notificationIdSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid notification ID'),
});

export const createGeneralAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  targetStudentIds: z.array(z.string()).optional(),
  priority: z.enum([...NOTIFICATION_PRIORITIES] as [string, ...string[]]).optional(),
});
