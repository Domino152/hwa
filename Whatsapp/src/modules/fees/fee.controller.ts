import type { Request, Response } from 'express';
import { FeeService } from './fee.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/errors.js';
import {
  createFeeStructureSchema,
  updateFeeStructureSchema,
  feeStructureQuerySchema,
  feeStructureByCodeSchema,
  createInstallmentSchema,
  bulkInstallmentSchema,
  recordPaymentSchema,
  revokeScholarshipSchema,
  createScholarshipSchema,
  createFineSchema,
  waiveFineSchema,
  recordFinePaymentSchema,
  sendReminderSchema,
  updatePaymentSchema,
} from './fee.schemas.js';

export class FeeController {
  constructor(private readonly feeService: FeeService) {}

  // ============================================================
  // LEGACY FEE ENDPOINTS
  // ============================================================

  getByStudentId = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const fee = await this.feeService.getLatestFeeByStudentId(studentId);
    sendSuccess(res, { fee, hasData: !!fee });
  };

  getByStudentAll = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const fees = await this.feeService.getAllFeesByStudent(studentId);
    sendSuccess(res, { fees, hasData: fees.length > 0 });
  };

  getByStudentAndSemester = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const fees = await this.feeService.getFeesByStudentSemester(studentId, semester, academicYear);
    sendSuccess(res, { fees, hasData: fees.length > 0 });
  };

  updatePayment = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const feeType = String(req.query.feeType);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const parsed = updatePaymentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const fee = await this.feeService.updateLegacyPayment(
      studentId,
      feeType,
      semester,
      academicYear,
      parsed.data.paidAmount,
    );
    sendSuccess(res, { fee });
  };

  getOverdueFees = async (req: Request, res: Response): Promise<void> => {
    const academicYear = String(req.query.academicYear);
    const fees = await this.feeService.getOverdueFees(academicYear);
    sendSuccess(res, { fees, total: fees.length });
  };

  getDepartmentSummary = async (req: Request, res: Response): Promise<void> => {
    const department = String(req.query.department);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const summary = await this.feeService.getDepartmentSummary(department, semester, academicYear);
    sendSuccess(res, summary);
  };

  // ============================================================
  // FEE STRUCTURE
  // ============================================================

  createFeeStructure = async (req: Request, res: Response): Promise<void> => {
    const parsed = createFeeStructureSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const record = await this.feeService.createFeeStructure({
      ...parsed.data,
      semester: parsed.data.semester ?? null,
      year: parsed.data.year ?? null,
      description: parsed.data.description ?? null,
    });
    sendSuccess(res, record, 201);
  };

  getFeeStructureByCode = async (req: Request, res: Response): Promise<void> => {
    const parsed = feeStructureByCodeSchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError('Invalid query', parsed.error.format());
    const record = await this.feeService.getFeeStructureByCode(parsed.data.code, parsed.data.academicYear);
    sendSuccess(res, record);
  };

  getFeeStructureById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const record = await this.feeService.getFeeStructureById(id);
    sendSuccess(res, record);
  };

  getFeeStructuresByProgram = async (req: Request, res: Response): Promise<void> => {
    const department = String(req.query.department);
    const program = String(req.query.program);
    const academicYear = String(req.query.academicYear);
    const records = await this.feeService.getFeeStructuresByProgram(department, program, academicYear);
    sendSuccess(res, { structures: records, total: records.length });
  };

  getFeeStructuresByDepartmentSemester = async (req: Request, res: Response): Promise<void> => {
    const department = String(req.query.department);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const records = await this.feeService.getFeeStructuresByDepartmentSemester(department, semester, academicYear);
    sendSuccess(res, { structures: records, total: records.length });
  };

  getAllFeeStructures = async (req: Request, res: Response): Promise<void> => {
    const parsed = feeStructureQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError('Invalid query', parsed.error.format());
    const records = await this.feeService.getAllFeeStructures(parsed.data);
    sendSuccess(res, { structures: records, total: records.length });
  };

  updateFeeStructure = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = updateFeeStructureSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const record = await this.feeService.updateFeeStructure(id, parsed.data);
    sendSuccess(res, record);
  };

  deleteFeeStructure = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    await this.feeService.deleteFeeStructure(id);
    sendSuccess(res, { deleted: true });
  };

  // ============================================================
  // INSTALLMENTS
  // ============================================================

  createInstallment = async (req: Request, res: Response): Promise<void> => {
    const parsed = createInstallmentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const record = await this.feeService.createInstallment({
      ...parsed.data,
      notes: parsed.data.notes ?? null,
    });
    sendSuccess(res, record, 201);
  };

  bulkCreateInstallments = async (req: Request, res: Response): Promise<void> => {
    const parsed = bulkInstallmentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const count = await this.feeService.bulkCreateInstallments(parsed.data);
    sendSuccess(res, { created: count }, 201);
  };

  getInstallmentsByStudent = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const academicYear = req.query.academicYear ? String(req.query.academicYear) : undefined;
    const semester = req.query.semester ? Number(req.query.semester) : undefined;
    const records = academicYear && semester
      ? await this.feeService.getInstallmentsByStudentSemester(studentId, semester, academicYear)
      : await this.feeService.getInstallmentsByStudent(studentId, academicYear);
    sendSuccess(res, { installments: records, total: records.length });
  };

  deleteInstallment = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    await this.feeService.deleteInstallment(id);
    sendSuccess(res, { deleted: true });
  };

  // ============================================================
  // PAYMENTS
  // ============================================================

  recordPayment = async (req: Request, res: Response): Promise<void> => {
    const parsed = recordPaymentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const result = await this.feeService.recordPayment({
      ...parsed.data,
      transactionId: parsed.data.transactionId ?? null,
      collectedBy: parsed.data.collectedBy ?? null,
      remarks: parsed.data.remarks ?? null,
    });
    sendSuccess(res, result, 201);
  };

  getPaymentByReceipt = async (req: Request, res: Response): Promise<void> => {
    const receiptNumber = String(req.params.receiptNumber);
    const payment = await this.feeService.getPaymentByReceipt(receiptNumber);
    sendSuccess(res, payment);
  };

  getPaymentsByStudent = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const semester = req.query.semester ? Number(req.query.semester) : undefined;
    const academicYear = req.query.academicYear ? String(req.query.academicYear) : undefined;

    let payments;
    if (semester && academicYear) {
      payments = await this.feeService.getPaymentsByStudentSemester(studentId, semester, academicYear);
    } else {
      payments = await this.feeService.getPaymentsByStudent(studentId, limit);
    }
    sendSuccess(res, { payments, total: payments.length });
  };

  refundPayment = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const payment = await this.feeService.refundPayment(id);
    sendSuccess(res, payment);
  };

  // ============================================================
  // RECEIPTS
  // ============================================================

  getReceipt = async (req: Request, res: Response): Promise<void> => {
    const receiptNumber = String(req.params.receiptNumber);
    const receipt = await this.feeService.getReceipt(receiptNumber);
    sendSuccess(res, receipt);
  };

  getReceiptsByStudent = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const receipts = await this.feeService.getReceiptsByStudent(studentId, limit);
    sendSuccess(res, { receipts, total: receipts.length });
  };

  // ============================================================
  // PENDING AMOUNT
  // ============================================================

  getPendingSummary = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const summary = await this.feeService.getPendingSummary(studentId, semester, academicYear);
    sendSuccess(res, summary);
  };

  // ============================================================
  // PAYMENT HISTORY
  // ============================================================

  getPaymentHistory = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const history = await this.feeService.getPaymentHistory(studentId);
    sendSuccess(res, history);
  };

  // ============================================================
  // SCHOLARSHIPS
  // ============================================================

  createScholarship = async (req: Request, res: Response): Promise<void> => {
    const parsed = createScholarshipSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const record = await this.feeService.createScholarship({
      ...parsed.data,
      percentage: parsed.data.percentage ?? null,
      semester: parsed.data.semester ?? null,
      reason: parsed.data.reason ?? null,
      approvedBy: parsed.data.approvedBy ?? null,
    });
    sendSuccess(res, record, 201);
  };

  getScholarshipById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const record = await this.feeService.getScholarshipById(id);
    sendSuccess(res, record);
  };

  getScholarshipsByStudent = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const academicYear = req.query.academicYear ? String(req.query.academicYear) : undefined;
    const semester = req.query.semester ? Number(req.query.semester) : undefined;
    const records = semester && academicYear
      ? await this.feeService.getActiveScholarships(studentId, semester, academicYear)
      : await this.feeService.getScholarshipsByStudent(studentId, academicYear);
    sendSuccess(res, { scholarships: records, total: records.length });
  };

  revokeScholarship = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = revokeScholarshipSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const record = await this.feeService.revokeScholarship(id, parsed.data.reason);
    sendSuccess(res, record);
  };

  deleteScholarship = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    await this.feeService.deleteScholarship(id);
    sendSuccess(res, { deleted: true });
  };

  // ============================================================
  // FINES
  // ============================================================

  createFine = async (req: Request, res: Response): Promise<void> => {
    const parsed = createFineSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const record = await this.feeService.createFine({
      ...parsed.data,
      installmentId: parsed.data.installmentId ?? null,
      imposedBy: parsed.data.imposedBy ?? null,
    });
    sendSuccess(res, record, 201);
  };

  getFineById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const record = await this.feeService.getFineById(id);
    sendSuccess(res, record);
  };

  getFinesByStudent = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const academicYear = req.query.academicYear ? String(req.query.academicYear) : undefined;
    const semester = req.query.semester ? Number(req.query.semester) : undefined;
    const records = semester && academicYear
      ? await this.feeService.getActiveFines(studentId, semester, academicYear)
      : await this.feeService.getFinesByStudent(studentId, academicYear);
    sendSuccess(res, { fines: records, total: records.length });
  };

  waiveFine = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = waiveFineSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const record = await this.feeService.waiveFine(
      id,
      parsed.data.waivedBy,
      parsed.data.reason,
      parsed.data.waivedAmount,
    );
    sendSuccess(res, record);
  };

  recordFinePayment = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = recordFinePaymentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());
    const record = await this.feeService.recordFinePayment({
      fineId: id,
      amount: parsed.data.amount,
      method: parsed.data.method,
      transactionId: parsed.data.transactionId ?? null,
      collectedBy: parsed.data.collectedBy ?? null,
    });
    sendSuccess(res, record);
  };

  deleteFine = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    await this.feeService.deleteFine(id);
    sendSuccess(res, { deleted: true });
  };

  // ============================================================
  // DUE-REMINDER NOTIFICATIONS
  // ============================================================

  sendDueReminders = async (req: Request, res: Response): Promise<void> => {
    const parsed = sendReminderSchema.safeParse(req.body ?? req.query);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.format());

    if (parsed.data.studentId) {
      const result = await this.feeService.sendDueRemindersForStudent(
        parsed.data.studentId,
        parsed.data.semester,
        parsed.data.academicYear,
      );
      sendSuccess(res, { ...result, scope: 'student' });
    } else {
      const result = await this.feeService.sendDueRemindersForAllStudents(
        parsed.data.semester,
        parsed.data.academicYear,
      );
      sendSuccess(res, { ...result, scope: 'all' });
    }
  };
}