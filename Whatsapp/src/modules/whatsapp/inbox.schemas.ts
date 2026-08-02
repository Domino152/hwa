import { z } from 'zod';

export const conversationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const messagesParamsSchema = z.object({
  phone: z.string().min(1, 'phone is required'),
});

export const messagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ConversationsQuery = z.infer<typeof conversationsQuerySchema>;
export type MessagesParams = z.infer<typeof messagesParamsSchema>;
export type MessagesQuery = z.infer<typeof messagesQuerySchema>;
