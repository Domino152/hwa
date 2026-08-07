import { z } from 'zod';

const ANNOUNCEMENT_AUDIENCES = ['all', 'students', 'parents', 'department'] as const;
const ANNOUNCEMENT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  audience: z.enum(ANNOUNCEMENT_AUDIENCES),
  department: z.string().optional(),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).default('normal'),
  publishedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  audience: z.enum(ANNOUNCEMENT_AUDIENCES).optional(),
  department: z.string().optional(),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).optional(),
  isActive: z.boolean().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const announcementQuerySchema = z.object({
  audience: z.enum(ANNOUNCEMENT_AUDIENCES).optional(),
  department: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
