import { z } from 'zod';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

export const createStudentSchema = z.object({
  userId: z.string().regex(objectIdRegex, 'Invalid user ID'),
  studentId: z.string().min(1).max(50),
  registerNumber: z.string().min(1).max(50),
  rollNumber: z.string().min(1).max(50),
  fullName: z.string().min(1).max(200),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10).max(15),
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().or(z.date()),
  department: z.string().min(1).max(100),
  program: z.string().min(1).max(100),
  semester: z.number().int().min(1).max(12),
  section: z.string().min(1).max(10),
  batch: z.string().min(1).max(50),
  advisor: z.string().min(1).max(200),
  parentId: z.string().regex(objectIdRegex, 'Invalid parent ID').nullable().optional(),
  whatsappNumber: z.string().min(10).max(15).nullable().optional(),
  parentWhatsappNumber: z.string().min(10).max(15).nullable().optional(),
  status: z.enum(['active', 'graduated', 'suspended']).optional(),
});

export const updateStudentSchema = z.object({
  rollNumber: z.string().min(1).max(50).optional(),
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(10).max(15).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfBirth: z.string().or(z.date()).optional(),
  department: z.string().min(1).max(100).optional(),
  program: z.string().min(1).max(100).optional(),
  semester: z.number().int().min(1).max(12).optional(),
  section: z.string().min(1).max(10).optional(),
  batch: z.string().min(1).max(50).optional(),
  advisor: z.string().min(1).max(200).optional(),
  parentId: z.string().regex(objectIdRegex, 'Invalid parent ID').nullable().optional(),
  whatsappNumber: z.string().min(10).max(15).nullable().optional(),
  parentWhatsappNumber: z.string().min(10).max(15).nullable().optional(),
  status: z.enum(['active', 'graduated', 'suspended']).optional(),
});

export const studentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  department: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(12).optional(),
  section: z.string().optional(),
  status: z.enum(['active', 'graduated', 'suspended']).optional(),
  program: z.string().optional(),
  batch: z.string().optional(),
  search: z.string().optional(),
});

export const studentParamsSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid student ID'),
});

export const studentIdParamsSchema = z.object({
  studentId: z.string().min(1),
});

export const registerNumberParamsSchema = z.object({
  registerNumber: z.string().min(1),
});

export const classParamsSchema = z.object({
  department: z.string().min(1),
  semester: z.coerce.number().int().min(1).max(12),
  section: z.string().min(1),
});
