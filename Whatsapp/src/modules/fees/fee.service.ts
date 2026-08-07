import type {
  IFeeRepository,
  IFeeStructureRepository,
  IInstallmentRepository,
  IPaymentRepository,
  IReceiptRepository,
  IScholarshipRepository,
  IFineRepository,
  IPendingAmountRepository,
} from '../../repositories/fee.repository.js';
import type { IUserRepository } from '../../repositories/user.repository.js';
import type {
  FeeRecord,
  FeeStructureRecord,
  InstallmentRecord,
  PaymentRecord,
  ReceiptRecord,
  ScholarshipRecord,
  FineRecord,
  PendingAmountRecord,
  PaymentHistoryRecord,
  PaymentMethod,
  PaymentStatus,
  InstallmentStatus,
} from '../../repositories/types.js';
import { NotFoundError, ValidationError } from '../../shared/utils/errors.js';

export interface CreateFeeStructureInput {
  code: string;
  name: string;
  category: FeeStructureRecord['category'];
  amount: number;
  frequency: FeeStructureRecord['frequency'];
  department: string;
  program: string;
  semester: number | null;
  year: number | null;
  academicYear: string;
  description?: string | null;
}

export interface CreateInstallmentInput {
  studentId: string;
  feeStructureId: string;
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  semester: number;
  academicYear: string;
  notes?: string | null;
}

export interface BulkInstallmentInput {
  studentId: string;
  semester: number;
  academicYear: string;
  installments: Array<{
    feeStructureId: string;
    installmentNumber: number;
    amount: number;
    dueDate: Date;
  }>;
}

export interface RecordPaymentInput {
  studentId: string;
  installmentId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string | null;
  collectedBy?: string | null;
  remarks?: string | null;
}

export interface CreateScholarshipInput {
  studentId: string;
  scholarshipName: string;
  type: ScholarshipRecord['type'];
  amount: number;
  percentage?: number | null;
  provider: string;
  validFrom: Date;
  validUntil: Date;
  semester?: number | null;
  academicYear: string;
  reason?: string | null;
  approvedBy?: string | null;
}

export interface CreateFineInput {
  studentId: string;
  reason: FineRecord['reason'];
  description: string;
  amount: number;
  dueDate: Date;
  installmentId?: string | null;
  semester: number;
  academicYear: string;
  imposedBy?: string | null;
}

export interface RecordFinePaymentInput {
  fineId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string | null;
  collectedBy?: string | null;
}

export interface FeeReminderService {
  createFeeReminder(input: {
    studentId: string;
    amount: number;
    dueDate: Date;
    feeType: string;
  }): Promise<unknown>;
}

export class FeeService {
  constructor(
    private readonly legacyRepo: IFeeRepository,
    private readonly structureRepo: IFeeStructureRepository,
    private readonly installmentRepo: IInstallmentRepository,
    private readonly paymentRepo: IPaymentRepository,
    private readonly receiptRepo: IReceiptRepository,
    private readonly scholarshipRepo: IScholarshipRepository,
    private readonly fineRepo: IFineRepository,
    private readonly pendingRepo: IPendingAmountRepository,
    private readonly userRepo?: IUserRepository,
    private readonly reminderService?: FeeReminderService,
  ) {}

  // ============================================================
  // LEGACY FEE API (backward compatible)
  // ============================================================

  async getLatestFeeByStudentId(studentId: string): Promise<FeeRecord | null> {
    return this.legacyRepo.findLatestFeeByStudentId(studentId);
  }

  async getAllFeesByStudent(studentId: string): Promise<FeeRecord[]> {
    return this.legacyRepo.findByStudentAll(studentId);
  }

  async getFeesByStudentSemester(studentId: string, semester: number, academicYear: string): Promise<FeeRecord[]> {
    return this.legacyRepo.findByStudentAndSemester(studentId, semester, academicYear);
  }

  async updateLegacyPayment(
    studentId: string,
    feeType: string,
    semester: number,
    academicYear: string,
    paidAmount: number,
  ): Promise<FeeRecord> {
    const existing = await this.legacyRepo.findByStudentAndSemester(studentId, semester, academicYear);
    const fee = existing.find((f) => f.feeType === feeType);
    if (!fee) throw new NotFoundError(`Fee record for ${feeType}`);
    const updated = await this.legacyRepo.updatePayment(studentId, feeType, semester, academicYear, paidAmount);
    if (!updated) throw new NotFoundError('Fee record after update');
    return updated;
  }

  async getOverdueFees(academicYear: string): Promise<FeeRecord[]> {
    return this.legacyRepo.findOverdueFees(academicYear);
  }

  async getDepartmentSummary(department: string, semester: number, academicYear: string) {
    return this.legacyRepo.getDepartmentFeeSummary(department, semester, academicYear);
  }

  // ============================================================
  // FEE STRUCTURE
  // ============================================================

  async createFeeStructure(input: CreateFeeStructureInput): Promise<FeeStructureRecord> {
    const existing = await this.structureRepo.findByCode(input.code, input.academicYear);
    if (existing) {
      throw new ValidationError(`Fee structure with code ${input.code} already exists for ${input.academicYear}`);
    }
    return this.structureRepo.create({
      ...input,
      isActive: true,
      description: input.description ?? null,
    });
  }

  async getFeeStructureByCode(code: string, academicYear: string): Promise<FeeStructureRecord> {
    const record = await this.structureRepo.findByCode(code, academicYear);
    if (!record) throw new NotFoundError(`Fee structure ${code} for ${academicYear}`);
    return record;
  }

  async getFeeStructureById(id: string): Promise<FeeStructureRecord> {
    const record = await this.structureRepo.findById(id);
    if (!record) throw new NotFoundError('Fee structure');
    return record;
  }

  async getFeeStructuresByProgram(department: string, program: string, academicYear: string): Promise<FeeStructureRecord[]> {
    return this.structureRepo.findByDepartmentProgram(department, program, academicYear);
  }

  async getFeeStructuresByDepartmentSemester(
    department: string,
    semester: number,
    academicYear: string,
  ): Promise<FeeStructureRecord[]> {
    return this.structureRepo.findByDepartmentSemester(department, semester, academicYear);
  }

  async getAllFeeStructures(filter: { department?: string; academicYear?: string; isActive?: boolean }): Promise<FeeStructureRecord[]> {
    return this.structureRepo.findAll(filter);
  }

  async updateFeeStructure(id: string, update: Partial<FeeStructureRecord>): Promise<FeeStructureRecord> {
    const updated = await this.structureRepo.update(id, update);
    if (!updated) throw new NotFoundError('Fee structure');
    return updated;
  }

  async deleteFeeStructure(id: string): Promise<void> {
    const deleted = await this.structureRepo.delete(id);
    if (!deleted) throw new NotFoundError('Fee structure');
  }

  // ============================================================
  // INSTALLMENTS
  // ============================================================

  async createInstallment(input: CreateInstallmentInput): Promise<InstallmentRecord> {
    const structure = await this.structureRepo.findById(input.feeStructureId);
    if (!structure) throw new NotFoundError('Fee structure');

    const status = computeInstallmentStatus(input.dueDate, 0, input.amount);

    return this.installmentRepo.create({
      installmentNumber: input.installmentNumber,
      studentId: input.studentId,
      feeStructureId: input.feeStructureId,
      feeCode: structure.code,
      feeName: structure.name,
      category: structure.category,
      amount: input.amount,
      paidAmount: 0,
      remainingAmount: input.amount,
      dueDate: input.dueDate,
      paidDate: null,
      status,
      semester: input.semester,
      academicYear: input.academicYear,
      lateFine: 0,
      notes: input.notes ?? null,
    });
  }

  async bulkCreateInstallments(input: BulkInstallmentInput): Promise<number> {
    const structures = await Promise.all(
      input.installments.map((i) => this.structureRepo.findById(i.feeStructureId)),
    );
    const records = input.installments.map((inst, idx) => {
      const structure = structures[idx];
      if (!structure) {
        throw new NotFoundError(`Fee structure at index ${idx}`);
      }
      const status = computeInstallmentStatus(inst.dueDate, 0, inst.amount);
      return {
        installmentNumber: inst.installmentNumber,
        studentId: input.studentId,
        feeStructureId: inst.feeStructureId,
        feeCode: structure.code,
        feeName: structure.name,
        category: structure.category,
        amount: inst.amount,
        paidAmount: 0,
        remainingAmount: inst.amount,
        dueDate: inst.dueDate,
        paidDate: null,
        status,
        semester: input.semester,
        academicYear: input.academicYear,
        lateFine: 0,
        notes: null,
      };
    });
    return this.installmentRepo.createMany(records);
  }

  async getInstallmentsByStudent(studentId: string, academicYear?: string): Promise<InstallmentRecord[]> {
    return this.installmentRepo.findByStudent(studentId, academicYear);
  }

  async getInstallmentsByStudentSemester(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<InstallmentRecord[]> {
    return this.installmentRepo.findByStudentAndSemester(studentId, semester, academicYear);
  }

  async deleteInstallment(id: string): Promise<void> {
    const deleted = await this.installmentRepo.delete(id);
    if (!deleted) throw new NotFoundError('Installment');
  }

  // ============================================================
  // PAYMENTS + RECEIPTS
  // ============================================================

  async recordPayment(input: RecordPaymentInput): Promise<{ payment: PaymentRecord; receipt: ReceiptRecord; installment: InstallmentRecord }> {
    const installment = await this.installmentRepo.findById(input.installmentId);
    if (!installment) throw new NotFoundError('Installment');
    if (input.studentId !== installment.studentId) {
      throw new ValidationError('Student does not match installment');
    }
    if (input.amount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero');
    }
    if (input.amount > installment.remainingAmount) {
      throw new ValidationError(
        `Payment amount (${input.amount}) exceeds remaining (${installment.remainingAmount})`,
      );
    }

    let studentName = 'Student';
    if (this.userRepo) {
      const student = await this.userRepo.findByStudentId(input.studentId);
      if (student) studentName = student.fullName;
    }

    const receiptNumber = await this.paymentRepo.getNextReceiptNumber();

    const payment = await this.paymentRepo.create({
      receiptNumber,
      studentId: input.studentId,
      installmentId: input.installmentId,
      feeStructureId: installment.feeStructureId,
      amount: input.amount,
      method: input.method,
      transactionId: input.transactionId ?? null,
      status: 'completed' as PaymentStatus,
      semester: installment.semester,
      academicYear: installment.academicYear,
      paidAt: new Date(),
      collectedBy: input.collectedBy ?? null,
      remarks: input.remarks ?? null,
    });

    const updatedInstallment = await this.installmentRepo.recordPayment(
      input.installmentId,
      input.amount,
      payment.paidAt,
    );
    if (!updatedInstallment) throw new NotFoundError('Installment after update');

    const receipt = await this.receiptRepo.create({
      receiptNumber,
      studentId: input.studentId,
      studentName,
      paymentId: payment.id!,
      installmentId: input.installmentId,
      feeCode: updatedInstallment.feeCode,
      feeName: updatedInstallment.feeName,
      amount: input.amount,
      totalPaid: updatedInstallment.paidAmount,
      remainingAmount: updatedInstallment.remainingAmount,
      method: input.method,
      transactionId: input.transactionId ?? null,
      semester: updatedInstallment.semester,
      academicYear: updatedInstallment.academicYear,
      generatedAt: new Date(),
      collectedBy: input.collectedBy ?? null,
      notes: input.remarks ?? null,
    });

    return { payment, receipt, installment: updatedInstallment };
  }

  async getPaymentByReceipt(receiptNumber: string): Promise<PaymentRecord> {
    const payment = await this.paymentRepo.findByReceiptNumber(receiptNumber);
    if (!payment) throw new NotFoundError(`Payment with receipt ${receiptNumber}`);
    return payment;
  }

  async getPaymentsByStudent(studentId: string, limit?: number): Promise<PaymentRecord[]> {
    return this.paymentRepo.findByStudent(studentId, limit);
  }

  async getPaymentsByStudentSemester(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<PaymentRecord[]> {
    return this.paymentRepo.findByStudentAndSemester(studentId, semester, academicYear);
  }

  async refundPayment(paymentId: string): Promise<PaymentRecord> {
    const updated = await this.paymentRepo.refundPayment(paymentId);
    if (!updated) throw new NotFoundError('Payment');
    return updated;
  }

  async getReceipt(receiptNumber: string): Promise<ReceiptRecord> {
    const receipt = await this.receiptRepo.findByReceiptNumber(receiptNumber);
    if (!receipt) throw new NotFoundError(`Receipt ${receiptNumber}`);
    return receipt;
  }

  async getReceiptsByStudent(studentId: string, limit?: number): Promise<ReceiptRecord[]> {
    return this.receiptRepo.findByStudent(studentId, limit);
  }

  // ============================================================
  // PENDING AMOUNT
  // ============================================================

  async getPendingSummary(studentId: string, semester: number, academicYear: string): Promise<PendingAmountRecord> {
    return this.pendingRepo.getPendingSummary(studentId, semester, academicYear);
  }

  // ============================================================
  // SCHOLARSHIPS
  // ============================================================

  async createScholarship(input: CreateScholarshipInput): Promise<ScholarshipRecord> {
    if (input.validUntil <= input.validFrom) {
      throw new ValidationError('validUntil must be after validFrom');
    }
    if (input.percentage !== null && input.percentage !== undefined && (input.percentage < 0 || input.percentage > 100)) {
      throw new ValidationError('Percentage must be between 0 and 100');
    }

    return this.scholarshipRepo.create({
      studentId: input.studentId,
      scholarshipName: input.scholarshipName,
      type: input.type,
      amount: input.amount,
      percentage: input.percentage ?? null,
      provider: input.provider,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      semester: input.semester ?? null,
      academicYear: input.academicYear,
      status: 'active',
      appliedAmount: 0,
      reason: input.reason ?? null,
      approvedBy: input.approvedBy ?? null,
    });
  }

  async getScholarshipById(id: string): Promise<ScholarshipRecord> {
    const record = await this.scholarshipRepo.findById(id);
    if (!record) throw new NotFoundError('Scholarship');
    return record;
  }

  async getScholarshipsByStudent(studentId: string, academicYear?: string): Promise<ScholarshipRecord[]> {
    return this.scholarshipRepo.findByStudent(studentId, academicYear);
  }

  async getActiveScholarships(studentId: string, semester: number, academicYear: string): Promise<ScholarshipRecord[]> {
    return this.scholarshipRepo.findActiveByStudent(studentId, semester, academicYear);
  }

  async revokeScholarship(id: string, reason: string): Promise<ScholarshipRecord> {
    const updated = await this.scholarshipRepo.revokeScholarship(id, reason);
    if (!updated) throw new NotFoundError('Scholarship');
    return updated;
  }

  async deleteScholarship(id: string): Promise<void> {
    const deleted = await this.scholarshipRepo.delete(id);
    if (!deleted) throw new NotFoundError('Scholarship');
  }

  // ============================================================
  // FINES
  // ============================================================

  async createFine(input: CreateFineInput): Promise<FineRecord> {
    if (input.amount <= 0) {
      throw new ValidationError('Fine amount must be greater than zero');
    }
    return this.fineRepo.create({
      studentId: input.studentId,
      reason: input.reason,
      description: input.description,
      amount: input.amount,
      waivedAmount: 0,
      netAmount: input.amount,
      paidAmount: 0,
      remainingAmount: input.amount,
      dueDate: input.dueDate,
      paidDate: null,
      status: 'pending',
      installmentId: input.installmentId ?? null,
      semester: input.semester,
      academicYear: input.academicYear,
      imposedBy: input.imposedBy ?? null,
      waivedBy: null,
      waiverReason: null,
    });
  }

  async getFineById(id: string): Promise<FineRecord> {
    const record = await this.fineRepo.findById(id);
    if (!record) throw new NotFoundError('Fine');
    return record;
  }

  async getFinesByStudent(studentId: string, academicYear?: string): Promise<FineRecord[]> {
    return this.fineRepo.findByStudent(studentId, academicYear);
  }

  async getActiveFines(studentId: string, semester: number, academicYear: string): Promise<FineRecord[]> {
    return this.fineRepo.findActiveByStudent(studentId, semester, academicYear);
  }

  async waiveFine(id: string, waivedBy: string, reason: string, waivedAmount?: number): Promise<FineRecord> {
    const fine = await this.fineRepo.findById(id);
    if (!fine) throw new NotFoundError('Fine');

    const amount = waivedAmount ?? fine.remainingAmount;
    if (amount <= 0) {
      throw new ValidationError('Waive amount must be greater than zero');
    }
    if (amount > fine.remainingAmount) {
      throw new ValidationError(
        `Waive amount (${amount}) exceeds remaining (${fine.remainingAmount})`,
      );
    }

    const updated = await this.fineRepo.waive(id, waivedBy, reason, amount);
    if (!updated) throw new NotFoundError('Fine after waiver');
    return updated;
  }

  async recordFinePayment(input: RecordFinePaymentInput): Promise<FineRecord> {
    const fine = await this.fineRepo.findById(input.fineId);
    if (!fine) throw new NotFoundError('Fine');
    if (input.amount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero');
    }
    if (input.amount > fine.remainingAmount) {
      throw new ValidationError(
        `Payment amount (${input.amount}) exceeds remaining (${fine.remainingAmount})`,
      );
    }
    const updated = await this.fineRepo.recordPayment(input.fineId, input.amount);
    if (!updated) throw new NotFoundError('Fine after payment');
    return updated;
  }

  async deleteFine(id: string): Promise<void> {
    const deleted = await this.fineRepo.delete(id);
    if (!deleted) throw new NotFoundError('Fine');
  }

  // ============================================================
  // PAYMENT HISTORY
  // ============================================================

  async getPaymentHistory(studentId: string): Promise<PaymentHistoryRecord> {
    return this.paymentRepo.getPaymentHistory(studentId);
  }

  // ============================================================
  // DUE-REMINDER NOTIFICATIONS (does NOT send WhatsApp directly)
  // ============================================================

  async sendDueRemindersForStudent(studentId: string, semester: number, academicYear: string): Promise<{ remindersSent: number; totalOverdue: number }> {
    if (!this.reminderService) {
      return { remindersSent: 0, totalOverdue: 0 };
    }

    const installments = await this.installmentRepo.findByStudentAndSemester(studentId, semester, academicYear);
    const now = new Date();
    const overdue = installments.filter(
      (i) => (i.status === 'overdue' || i.status === 'due') && i.dueDate < now && i.remainingAmount > 0,
    );

    let remindersSent = 0;
    for (const inst of overdue) {
      await this.reminderService.createFeeReminder({
        studentId,
        amount: inst.remainingAmount,
        dueDate: inst.dueDate,
        feeType: `${inst.feeName} (#${inst.installmentNumber})`,
      });
      remindersSent++;
    }

    return { remindersSent, totalOverdue: overdue.length };
  }

  async sendDueRemindersForAllStudents(semester: number, academicYear: string): Promise<{
    studentsProcessed: number;
    totalReminders: number;
  }> {
    if (!this.reminderService) {
      return { studentsProcessed: 0, totalReminders: 0 };
    }

    const studentIds = await this.installmentRepo.findOverdueByDate(new Date());
    const uniqueStudentIds = [...new Set(studentIds.map((i) => i.studentId))];

    let totalReminders = 0;
    for (const studentId of uniqueStudentIds) {
      const result = await this.sendDueRemindersForStudent(studentId, semester, academicYear);
      totalReminders += result.remindersSent;
    }

    return { studentsProcessed: uniqueStudentIds.length, totalReminders };
  }
}

// ============================================================
// HELPERS
// ============================================================

export function computeInstallmentStatus(dueDate: Date, paidAmount: number, totalAmount: number): InstallmentStatus {
  if (paidAmount >= totalAmount) return 'paid';
  if (paidAmount > 0 && paidAmount < totalAmount) return 'partial';
  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'due';
  return 'upcoming';
}