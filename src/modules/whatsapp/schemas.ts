import { z } from 'zod';

export const sendMessageSchema = z.object({
  phone: z
    .string({ required_error: 'phone is required' })
    .min(1, 'phone is required')
    .max(30, 'phone is too long'),
  message: z
    .string({ required_error: 'message is required' })
    .min(1, 'message cannot be empty')
    .max(4096, 'message exceeds WhatsApp maximum length (4096)'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
