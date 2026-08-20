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

export const registerStudentSchema = z.object({
  phone: z.string().min(1, 'phone is required'),
  registerNumber: z.string().min(1, 'registerNumber is required'),
  fullName: z.string().min(1, 'fullName is required'),
  department: z.string().min(1, 'department is required'),
  year: z.number().min(1).max(6),
  section: z.string().min(1, 'section is required'),
  password: z.string().min(1, 'password is required'),
});

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;
