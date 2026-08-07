import { z } from 'zod';

const ANNOUNCEMENT_AUDIENCES = ['all', 'students', 'parents', 'department'] as const;
const ANNOUNCEMENT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
const ANNOUNCEMENT_CATEGORIES = ['college', 'department'] as const;

const attachmentSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(50),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.enum(ANNOUNCEMENT_CATEGORIES).default('college'),
  audience: z.enum(ANNOUNCEMENT_AUDIENCES),
  department: z.string().min(1).max(100).optional(),
  semester: z.number().int().min(1).max(8).nullable().optional(),
  academicYear: z.string().min(1).max(20).nullable().optional(),
  targetSemesters: z.array(z.number().int().min(1).max(8)).optional(),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).default('normal'),
  attachments: z.array(attachmentSchema).max(5).optional(),
  publishedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  sendNotification: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.category === 'department' && !data.department) return false;
    return true;
  },
  { message: 'Department announcements must specify a department', path: ['department'] },
).refine(
  (data) => {
    if (data.semester !== null && data.semester !== undefined && data.targetSemesters?.length) return false;
    return true;
  },
  { message: 'Cannot set both semester and targetSemesters', path: ['targetSemesters'] },
);

export const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  category: z.enum(ANNOUNCEMENT_CATEGORIES).optional(),
  audience: z.enum(ANNOUNCEMENT_AUDIENCES).optional(),
  department: z.string().min(1).max(100).nullable().optional(),
  semester: z.number().int().min(1).max(8).nullable().optional(),
  academicYear: z.string().min(1).max(20).nullable().optional(),
  targetSemesters: z.array(z.number().int().min(1).max(8)).optional(),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).optional(),
  attachments: z.array(attachmentSchema).max(5).optional(),
  isActive: z.boolean().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const announcementQuerySchema = z.object({
  audience: z.enum(ANNOUNCEMENT_AUDIENCES).optional(),
  department: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  academicYear: z.string().optional(),
  category: z.enum(ANNOUNCEMENT_CATEGORIES).optional(),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const publishAnnouncementSchema = z.object({
  sendNotification: z.boolean().default(false),
});
