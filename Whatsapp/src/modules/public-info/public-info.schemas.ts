import { z } from 'zod';

const PUBLIC_CONTENT_CATEGORIES = [
  'campus_info', 'academic', 'fees', 'exam_results', 'hostel',
  'library', 'placements', 'events', 'rules', 'guidelines',
  'procedures', 'faqs', 'courses', 'faculty',
] as const;

export const createPublicContentSchema = z.object({
  category: z.enum(PUBLIC_CONTENT_CATEGORIES),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  keywords: z.array(z.string().min(1).max(50)).max(20).optional(),
  isActive: z.boolean().default(true),
});

export const updatePublicContentSchema = z.object({
  category: z.enum(PUBLIC_CONTENT_CATEGORIES).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  keywords: z.array(z.string().min(1).max(50)).max(20).optional(),
  isActive: z.boolean().optional(),
});

export const publicContentQuerySchema = z.object({
  category: z.enum(PUBLIC_CONTENT_CATEGORIES).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
