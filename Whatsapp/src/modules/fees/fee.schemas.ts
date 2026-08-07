import { z } from 'zod';

export const createFeeSchema = z.object({
  studentId: z.string().min(1),
  feeType: z.string().min(1).max(50),
  totalFee: z.number().min(0),
  paidAmount: z.number().min(0).default(0),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  semester: z.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
});

export const updatePaymentSchema = z.object({
  paidAmount: z.number().min(0),
});

export const feeQuerySchema = z.object({
  studentId: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  status: z.enum(['paid', 'partial', 'pending']).optional(),
});

export const feeParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid fee ID'),
});
