import { z } from 'zod';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string().min(1, 'Message content is required'),
});

export const chatSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(4096, 'Message must be 4096 characters or fewer'),
  history: z.array(chatMessageSchema).max(50, 'History must have 50 messages or fewer').optional(),
});

export type ChatRequestBody = z.infer<typeof chatSchema>;
