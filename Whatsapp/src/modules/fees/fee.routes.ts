import { Router } from 'express';
import { FeeController } from './fee.controller.js';
import { feeService } from './index.js';
import { authenticate } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../middleware/async-handler.js';

const feeController = new FeeController(feeService);

const router = Router();

// ============================================================
// LEGACY FEE ENDPOINTS (backward compatible)
// ============================================================

router.get(
  '/student/:studentId',
  authenticate,
  asyncHandler(feeController.getByStudentId),
);

router.get(
  '/student/:studentId/all',
  authenticate,
  asyncHandler(feeController.getByStudentAll),
);

router.get(
  '/student/:studentId/semester',
  authenticate,
  asyncHandler(feeController.getByStudentAndSemester),
);

router.put(
  '/student/:studentId/payment',
  authenticate,
  asyncHandler(feeController.updatePayment),
);

router.get(
  '/overdue',
  authenticate,
  asyncHandler(feeController.getOverdueFees),
);

router.get(
  '/department/summary',
  authenticate,
  asyncHandler(feeController.getDepartmentSummary),
);

// ============================================================
// FEE STRUCTURE
// ============================================================

router.post(
  '/structures',
  authenticate,
  asyncHandler(feeController.createFeeStructure),
);

router.get(
  '/structures',
  authenticate,
  asyncHandler(feeController.getAllFeeStructures),
);

router.get(
  '/structures/by-code',
  authenticate,
  asyncHandler(feeController.getFeeStructureByCode),
);

router.get(
  '/structures/by-program',
  authenticate,
  asyncHandler(feeController.getFeeStructuresByProgram),
);

router.get(
  '/structures/by-department-semester',
  authenticate,
  asyncHandler(feeController.getFeeStructuresByDepartmentSemester),
);

router.get(
  '/structures/:id',
  authenticate,
  asyncHandler(feeController.getFeeStructureById),
);

router.put(
  '/structures/:id',
  authenticate,
  asyncHandler(feeController.updateFeeStructure),
);

router.delete(
  '/structures/:id',
  authenticate,
  asyncHandler(feeController.deleteFeeStructure),
);

// ============================================================
// INSTALLMENTS
// ============================================================

router.post(
  '/installments',
  authenticate,
  asyncHandler(feeController.createInstallment),
);

router.post(
  '/installments/bulk',
  authenticate,
  asyncHandler(feeController.bulkCreateInstallments),
);

router.get(
  '/installments/student/:studentId',
  authenticate,
  asyncHandler(feeController.getInstallmentsByStudent),
);

router.delete(
  '/installments/:id',
  authenticate,
  asyncHandler(feeController.deleteInstallment),
);

// ============================================================
// PAYMENTS
// ============================================================

router.post(
  '/payments',
  authenticate,
  asyncHandler(feeController.recordPayment),
);

router.get(
  '/payments/by-receipt/:receiptNumber',
  authenticate,
  asyncHandler(feeController.getPaymentByReceipt),
);

router.get(
  '/payments/student/:studentId',
  authenticate,
  asyncHandler(feeController.getPaymentsByStudent),
);

router.post(
  '/payments/:id/refund',
  authenticate,
  asyncHandler(feeController.refundPayment),
);

// ============================================================
// RECEIPTS
// ============================================================

router.get(
  '/receipts/:receiptNumber',
  authenticate,
  asyncHandler(feeController.getReceipt),
);

router.get(
  '/receipts/student/:studentId',
  authenticate,
  asyncHandler(feeController.getReceiptsByStudent),
);

// ============================================================
// PENDING AMOUNT
// ============================================================

router.get(
  '/pending/:studentId',
  authenticate,
  asyncHandler(feeController.getPendingSummary),
);

// ============================================================
// PAYMENT HISTORY
// ============================================================

router.get(
  '/history/:studentId',
  authenticate,
  asyncHandler(feeController.getPaymentHistory),
);

// ============================================================
// SCHOLARSHIPS
// ============================================================

router.post(
  '/scholarships',
  authenticate,
  asyncHandler(feeController.createScholarship),
);

router.get(
  '/scholarships/student/:studentId',
  authenticate,
  asyncHandler(feeController.getScholarshipsByStudent),
);

router.get(
  '/scholarships/:id',
  authenticate,
  asyncHandler(feeController.getScholarshipById),
);

router.post(
  '/scholarships/:id/revoke',
  authenticate,
  asyncHandler(feeController.revokeScholarship),
);

router.delete(
  '/scholarships/:id',
  authenticate,
  asyncHandler(feeController.deleteScholarship),
);

// ============================================================
// FINES
// ============================================================

router.post(
  '/fines',
  authenticate,
  asyncHandler(feeController.createFine),
);

router.get(
  '/fines/student/:studentId',
  authenticate,
  asyncHandler(feeController.getFinesByStudent),
);

router.get(
  '/fines/:id',
  authenticate,
  asyncHandler(feeController.getFineById),
);

router.post(
  '/fines/:id/waive',
  authenticate,
  asyncHandler(feeController.waiveFine),
);

router.post(
  '/fines/:id/pay',
  authenticate,
  asyncHandler(feeController.recordFinePayment),
);

router.delete(
  '/fines/:id',
  authenticate,
  asyncHandler(feeController.deleteFine),
);

// ============================================================
// DUE-REMINDER NOTIFICATIONS
// ============================================================

router.post(
  '/reminders',
  authenticate,
  asyncHandler(feeController.sendDueReminders),
);

export default router;