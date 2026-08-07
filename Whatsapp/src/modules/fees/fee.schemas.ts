import { z } from 'zod';

const academicYearRegex = /^\d{4}-\d{2}$/;

const feeCategories = ['tuition', 'hostel', 'exam', 'lab', 'transport', 'library', 'sports', 'development', 'misc'] as const;
const feeFrequencies = ['one_time', 'semester', 'yearly'] as const;
const paymentMethods = ['cash', 'card', 'upi', 'netbanking', 'cheque', 'dd', 'online'] as const;
const scholarshipTypes = ['merit', 'need_based', 'sports', 'government', 'institutional', 'other'] as const;
const fineReasons = ['late_payment', 'absenteeism', 'damage', 'library_overdue', 'discipline', 'other'] as const;

// ============================================================
// LEGACY FEE
// ============================================================

export const createFeeSchema = z.object({
  studentId: z.string().min(1),
  feeType: z.string().min(1).max(50),
  totalFee: z.number().min(0),
  paidAmount: z.number().min(0).default(0),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  semester: z.number().int().min(1).max(8),
  academicYear: z.string().regex(academicYearRegex),
});

export const updatePaymentSchema = z.object({
  paidAmount: z.number().min(0),
});

export const feeQuerySchema = z.object({
  studentId: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  academicYear: z.string().regex(academicYearRegex).optional(),
  status: z.enum(['paid', 'partial', 'pending']).optional(),
});

export const feeParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid fee ID'),
});

// ============================================================
// FEE STRUCTURE
// ============================================================

export const createFeeStructureSchema = z.object({
  code: z.string().min(1).max(50).trim(),
  name: z.string().min(1).max(100).trim(),
  category: z.enum(feeCategories),
  amount: z.number().min(0),
  frequency: z.enum(feeFrequencies),
  department: z.string().min(1).max(10).trim(),
  program: z.string().min(1).max(50).trim(),
  semester: z.number().int().min(1).max(12).nullable().optional(),
  year: z.number().int().min(1).max(6).nullable().optional(),
  academicYear: z.string().regex(academicYearRegex),
  description: z.string().max(500).nullable().optional(),
});

export const updateFeeStructureSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  amount: z.number().min(0).optional(),
  frequency: z.enum(feeFrequencies).optional(),
  isActive: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
});

export const feeStructureQuerySchema = z.object({
  department: z.string().optional(),
  program: z.string().optional(),
  academicYear: z.string().regex(academicYearRegex).optional(),
  isActive: z.coerce.boolean().optional(),
});

export const feeStructureByCodeSchema = z.object({
  code: z.string().min(1),
  academicYear: z.string().regex(academicYearRegex),
});

export const feeStructureParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid fee structure ID'),
});

// ============================================================
// INSTALLMENT
// ============================================================

export const createInstallmentSchema = z.object({
  studentId: z.string().min(1),
  feeStructureId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid fee structure ID'),
  installmentNumber: z.number().int().min(1),
  amount: z.number().min(0),
  dueDate: z.coerce.date(),
  semester: z.number().int().min(1).max(12),
  academicYear: z.string().regex(academicYearRegex),
  notes: z.string().max(500).nullable().optional(),
});

export const bulkInstallmentSchema = z.object({
  studentId: z.string().min(1),
  semester: z.number().int().min(1).max(12),
  academicYear: z.string().regex(academicYearRegex),
  installments: z
    .array(
      z.object({
        feeStructureId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid fee structure ID'),
        installmentNumber: z.number().int().min(1),
        amount: z.number().min(0),
        dueDate: z.coerce.date(),
      }),
    )
    .min(1)
    .max(50),
});

export const installmentParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid installment ID'),
});

export const installmentQuerySchema = z.object({
  academicYear: z.string().regex(academicYearRegex).optional(),
  semester: z.coerce.number().int().min(1).max(12).optional(),
});

// ============================================================
// PAYMENT
// ============================================================

export const recordPaymentSchema = z.object({
  studentId: z.string().min(1),
  installmentId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid installment ID'),
  amount: z.number().positive(),
  method: z.enum(paymentMethods),
  transactionId: z.string().min(1).max(100).nullable().optional(),
  collectedBy: z.string().min(1).max(100).nullable().optional(),
  remarks: z.string().max(500).nullable().optional(),
});

export const paymentParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid payment ID'),
});

export const paymentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  semester: z.coerce.number().int().min(1).max(12).optional(),
  academicYear: z.string().regex(academicYearRegex).optional(),
});

// ============================================================
// RECEIPT
// ============================================================

export const receiptParamsSchema = z.object({
  receiptNumber: z.string().min(1).max(50),
});

// ============================================================
// SCHOLARSHIP
// ============================================================

export const createScholarshipSchema = z.object({
  studentId: z.string().min(1),
  scholarshipName: z.string().min(1).max(100).trim(),
  type: z.enum(scholarshipTypes),
  amount: z.number().min(0),
  percentage: z.number().min(0).max(100).nullable().optional(),
  provider: z.string().min(1).max(100).trim(),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
  semester: z.number().int().min(1).max(12).nullable().optional(),
  academicYear: z.string().regex(academicYearRegex),
  reason: z.string().max(500).nullable().optional(),
  approvedBy: z.string().min(1).max(100).nullable().optional(),
});

export const revokeScholarshipSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const scholarshipParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid scholarship ID'),
});

// ============================================================
// FINE
// ============================================================

export const createFineSchema = z.object({
  studentId: z.string().min(1),
  reason: z.enum(fineReasons),
  description: z.string().min(1).max(500).trim(),
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
  installmentId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid installment ID').nullable().optional(),
  semester: z.number().int().min(1).max(12),
  academicYear: z.string().regex(academicYearRegex),
  imposedBy: z.string().min(1).max(100).nullable().optional(),
});

export const waiveFineSchema = z.object({
  waivedBy: z.string().min(1).max(100),
  reason: z.string().min(1).max(500),
  waivedAmount: z.number().positive().optional(),
});

export const recordFinePaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(paymentMethods),
  transactionId: z.string().min(1).max(100).nullable().optional(),
  collectedBy: z.string().min(1).max(100).nullable().optional(),
});

export const fineParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid fine ID'),
});

// ============================================================
// REMINDERS
// ============================================================

export const sendReminderSchema = z.object({
  studentId: z.string().min(1).optional(),
  semester: z.number().int().min(1).max(12),
  academicYear: z.string().regex(academicYearRegex),
});

export const pendingSummaryQuerySchema = z.object({
  semester: z.coerce.number().int().min(1).max(12),
  academicYear: z.string().regex(academicYearRegex),
});

export const paymentHistoryQuerySchema = z.object({
  studentId: z.string().min(1),
});