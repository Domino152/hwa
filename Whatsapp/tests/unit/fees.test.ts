import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeeService, computeInstallmentStatus } from '../../src/modules/fees/fee.service.js';
import type {
  IFeeRepository,
  IFeeStructureRepository,
  IInstallmentRepository,
  IPaymentRepository,
  IReceiptRepository,
  IScholarshipRepository,
  IFineRepository,
  IPendingAmountRepository,
  FeeReminderService,
} from '../../src/repositories/fee.repository.js';
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
} from '../../src/repositories/types.js';

function makeFeeStructure(overrides: Partial<FeeStructureRecord> = {}): FeeStructureRecord {
  return {
    id: '507f1f77bcf86cd799439011',
    code: 'TUITION',
    name: 'Tuition Fee',
    category: 'tuition',
    amount: 50000,
    frequency: 'semester',
    department: 'CSE',
    program: 'B.Tech',
    semester: 1,
    year: 1,
    academicYear: '2025-26',
    isActive: true,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeInstallment(overrides: Partial<InstallmentRecord> = {}): InstallmentRecord {
  return {
    id: '507f1f77bcf86cd799439012',
    installmentNumber: 1,
    studentId: '22CSE001',
    feeStructureId: '507f1f77bcf86cd799439011',
    feeCode: 'TUITION',
    feeName: 'Tuition Fee',
    category: 'tuition',
    amount: 50000,
    paidAmount: 0,
    remainingAmount: 50000,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paidDate: null,
    status: 'upcoming',
    semester: 1,
    academicYear: '2025-26',
    lateFine: 0,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePayment(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    id: '507f1f77bcf86cd799439013',
    receiptNumber: 'RCP-202508-00001',
    studentId: '22CSE001',
    installmentId: '507f1f77bcf86cd799439012',
    feeStructureId: '507f1f77bcf86cd799439011',
    amount: 25000,
    method: 'upi',
    transactionId: 'TXN123',
    status: 'completed',
    semester: 1,
    academicYear: '2025-26',
    paidAt: new Date(),
    collectedBy: 'cashier',
    remarks: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeReceipt(overrides: Partial<ReceiptRecord> = {}): ReceiptRecord {
  return {
    id: '507f1f77bcf86cd799439014',
    receiptNumber: 'RCP-202508-00001',
    studentId: '22CSE001',
    studentName: 'Arjun',
    paymentId: '507f1f77bcf86cd799439013',
    installmentId: '507f1f77bcf86cd799439012',
    feeCode: 'TUITION',
    feeName: 'Tuition Fee',
    amount: 25000,
    totalPaid: 25000,
    remainingAmount: 25000,
    method: 'upi',
    transactionId: 'TXN123',
    semester: 1,
    academicYear: '2025-26',
    generatedAt: new Date(),
    collectedBy: 'cashier',
    notes: null,
    ...overrides,
  };
}

function makeScholarship(overrides: Partial<ScholarshipRecord> = {}): ScholarshipRecord {
  return {
    id: '507f1f77bcf86cd799439015',
    studentId: '22CSE001',
    scholarshipName: 'Merit Scholarship',
    type: 'merit',
    amount: 10000,
    percentage: 20,
    provider: 'Government of India',
    validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    semester: 1,
    academicYear: '2025-26',
    status: 'active',
    appliedAmount: 0,
    reason: null,
    approvedBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeFine(overrides: Partial<FineRecord> = {}): FineRecord {
  return {
    id: '507f1f77bcf86cd799439016',
    studentId: '22CSE001',
    reason: 'late_payment',
    description: 'Late fee payment',
    amount: 500,
    waivedAmount: 0,
    netAmount: 500,
    paidAmount: 0,
    remainingAmount: 500,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    paidDate: null,
    status: 'pending',
    installmentId: null,
    semester: 1,
    academicYear: '2025-26',
    imposedBy: 'admin',
    waivedBy: null,
    waiverReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeLegacyFee(overrides: Partial<FeeRecord> = {}): FeeRecord {
  return {
    studentId: '22CSE001',
    feeType: 'Tuition',
    totalFee: 50000,
    paidAmount: 25000,
    remainingAmount: 25000,
    dueDate: new Date(),
    status: 'partial',
    semester: 1,
    academicYear: '2025-26',
    ...overrides,
  };
}

function makePendingSummary(overrides: Partial<PendingAmountRecord> = {}): PendingAmountRecord {
  return {
    studentId: '22CSE001',
    totalPending: 25000,
    overdueAmount: 0,
    upcomingAmount: 25000,
    fineAmount: 0,
    scholarshipCredit: 0,
    netPayable: 25000,
    installmentCount: 1,
    overdueCount: 0,
    nextDueDate: new Date(),
    nextDueAmount: 25000,
    ...overrides,
  };
}

function makePaymentHistory(overrides: Partial<PaymentHistoryRecord> = {}): PaymentHistoryRecord {
  return {
    payments: [],
    totalPaid: 0,
    totalRefunded: 0,
    netPaid: 0,
    totalTransactions: 0,
    byMethod: { cash: 0, card: 0, upi: 0, netbanking: 0, cheque: 0, dd: 0, online: 0 },
    ...overrides,
  };
}

describe('computeInstallmentStatus', () => {
  it('returns paid when paidAmount equals totalAmount', () => {
    const due = new Date(Date.now() + 10000);
    expect(computeInstallmentStatus(due, 50000, 50000)).toBe('paid');
  });

  it('returns partial when paidAmount > 0 but < totalAmount', () => {
    const due = new Date(Date.now() + 10000);
    expect(computeInstallmentStatus(due, 25000, 50000)).toBe('partial');
  });

  it('returns overdue when dueDate is in the past and nothing paid', () => {
    const due = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(computeInstallmentStatus(due, 0, 50000)).toBe('overdue');
  });

  it('returns due when dueDate is within 7 days', () => {
    const due = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    expect(computeInstallmentStatus(due, 0, 50000)).toBe('due');
  });

  it('returns upcoming when dueDate is more than 7 days away', () => {
    const due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    expect(computeInstallmentStatus(due, 0, 50000)).toBe('upcoming');
  });
});

describe('FeeService', () => {
  let legacyRepo: IFeeRepository;
  let structureRepo: IFeeStructureRepository;
  let installmentRepo: IInstallmentRepository;
  let paymentRepo: IPaymentRepository;
  let receiptRepo: IReceiptRepository;
  let scholarshipRepo: IScholarshipRepository;
  let fineRepo: IFineRepository;
  let pendingRepo: IPendingAmountRepository;
  let reminderService: FeeReminderService;
  let service: FeeService;

  beforeEach(() => {
    legacyRepo = {
      findLatestFeeByStudentId: vi.fn(),
      findByStudentAll: vi.fn(),
      findByStudentAndSemester: vi.fn(),
      updatePayment: vi.fn(),
      findOverdueFees: vi.fn(),
      getDepartmentFeeSummary: vi.fn(),
    };

    structureRepo = {
      create: vi.fn(),
      findByCode: vi.fn(),
      findById: vi.fn(),
      findByDepartmentProgram: vi.fn(),
      findByDepartmentSemester: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    installmentRepo = {
      create: vi.fn(),
      createMany: vi.fn(),
      findById: vi.fn(),
      findByStudent: vi.fn(),
      findByStudentAndSemester: vi.fn(),
      findByStudentSemesterCategory: vi.fn(),
      findOverdueByDate: vi.fn(),
      findDueByDate: vi.fn(),
      update: vi.fn(),
      recordPayment: vi.fn(),
      delete: vi.fn(),
      deleteByStudentFee: vi.fn(),
    };

    paymentRepo = {
      create: vi.fn(),
      findByReceiptNumber: vi.fn(),
      findByStudent: vi.fn(),
      findByStudentAndSemester: vi.fn(),
      findByInstallment: vi.fn(),
      updateStatus: vi.fn(),
      refundPayment: vi.fn(),
      getPaymentHistory: vi.fn(),
      getNextReceiptNumber: vi.fn(),
    };

    receiptRepo = {
      create: vi.fn(),
      findByReceiptNumber: vi.fn(),
      findByStudent: vi.fn(),
      findByStudentAndSemester: vi.fn(),
    };

    scholarshipRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByStudent: vi.fn(),
      findActiveByStudent: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      applyScholarship: vi.fn(),
      revokeScholarship: vi.fn(),
    };

    fineRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByStudent: vi.fn(),
      findActiveByStudent: vi.fn(),
      waive: vi.fn(),
      recordPayment: vi.fn(),
      delete: vi.fn(),
      sumUnpaidByStudent: vi.fn(),
    };

    pendingRepo = {
      getPendingSummary: vi.fn(),
    };

    reminderService = {
      createFeeReminder: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    service = new FeeService(
      legacyRepo,
      structureRepo,
      installmentRepo,
      paymentRepo,
      receiptRepo,
      scholarshipRepo,
      fineRepo,
      pendingRepo,
      undefined,
      reminderService,
    );
  });

  // ============================================================
  // LEGACY FEE
  // ============================================================

  describe('Legacy Fee API', () => {
    it('returns latest fee for student', async () => {
      const fee = makeLegacyFee();
      vi.mocked(legacyRepo.findLatestFeeByStudentId).mockResolvedValue(fee);

      const result = await service.getLatestFeeByStudentId('22CSE001');
      expect(result).toEqual(fee);
    });

    it('updates legacy payment and throws if not found', async () => {
      vi.mocked(legacyRepo.findByStudentAndSemester).mockResolvedValue([]);
      await expect(
        service.updateLegacyPayment('22CSE001', 'Tuition', 1, '2025-26', 25000),
      ).rejects.toThrow('not found');
    });

    it('updates legacy payment successfully', async () => {
      const fee = makeLegacyFee({ feeType: 'Tuition' });
      vi.mocked(legacyRepo.findByStudentAndSemester).mockResolvedValue([fee]);
      vi.mocked(legacyRepo.updatePayment).mockResolvedValue({ ...fee, paidAmount: 50000, status: 'paid' });

      const result = await service.updateLegacyPayment('22CSE001', 'Tuition', 1, '2025-26', 50000);
      expect(result.paidAmount).toBe(50000);
      expect(result.status).toBe('paid');
    });
  });

  // ============================================================
  // FEE STRUCTURE
  // ============================================================

  describe('Fee Structure', () => {
    it('creates a fee structure and rejects duplicates', async () => {
      const structure = makeFeeStructure();
      vi.mocked(structureRepo.findByCode).mockResolvedValueOnce(null).mockResolvedValueOnce(structure);
      vi.mocked(structureRepo.create).mockResolvedValue(structure);

      const created = await service.createFeeStructure({
        code: 'TUITION',
        name: 'Tuition Fee',
        category: 'tuition',
        amount: 50000,
        frequency: 'semester',
        department: 'CSE',
        program: 'B.Tech',
        semester: 1,
        year: 1,
        academicYear: '2025-26',
      });
      expect(created.code).toBe('TUITION');

      await expect(
        service.createFeeStructure({
          code: 'TUITION',
          name: 'Tuition Fee',
          category: 'tuition',
          amount: 50000,
          frequency: 'semester',
          department: 'CSE',
          program: 'B.Tech',
          semester: 1,
          year: 1,
          academicYear: '2025-26',
        }),
      ).rejects.toThrow('already exists');
    });

    it('throws NotFound when fee structure code does not exist', async () => {
      vi.mocked(structureRepo.findByCode).mockResolvedValue(null);
      await expect(service.getFeeStructureByCode('MISSING', '2025-26')).rejects.toThrow('not found');
    });

    it('updates a fee structure', async () => {
      const structure = makeFeeStructure({ amount: 60000 });
      vi.mocked(structureRepo.update).mockResolvedValue(structure);

      const updated = await service.updateFeeStructure(structure.id!, { amount: 60000 });
      expect(updated.amount).toBe(60000);
    });

    it('throws when updating a missing fee structure', async () => {
      vi.mocked(structureRepo.update).mockResolvedValue(null);
      await expect(service.updateFeeStructure('507f1f77bcf86cd799439099', { amount: 1 })).rejects.toThrow('not found');
    });

    it('deletes a fee structure', async () => {
      vi.mocked(structureRepo.delete).mockResolvedValue(true);
      await expect(service.deleteFeeStructure('507f1f77bcf86cd799439011')).resolves.not.toThrow();
    });

    it('throws when deleting a missing fee structure', async () => {
      vi.mocked(structureRepo.delete).mockResolvedValue(false);
      await expect(service.deleteFeeStructure('507f1f77bcf86cd799439099')).rejects.toThrow('not found');
    });
  });

  // ============================================================
  // INSTALLMENTS
  // ============================================================

  describe('Installments', () => {
    it('creates an installment with computed status', async () => {
      const structure = makeFeeStructure();
      const installment = makeInstallment({ status: 'upcoming' });
      vi.mocked(structureRepo.findById).mockResolvedValue(structure);
      vi.mocked(installmentRepo.create).mockResolvedValue(installment);

      const result = await service.createInstallment({
        studentId: '22CSE001',
        feeStructureId: structure.id!,
        installmentNumber: 1,
        amount: 50000,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        semester: 1,
        academicYear: '2025-26',
      });
      expect(result.status).toBe('upcoming');
    });

    it('throws when fee structure not found for installment', async () => {
      vi.mocked(structureRepo.findById).mockResolvedValue(null);
      await expect(
        service.createInstallment({
          studentId: '22CSE001',
          feeStructureId: '507f1f77bcf86cd799439099',
          installmentNumber: 1,
          amount: 50000,
          dueDate: new Date(),
          semester: 1,
          academicYear: '2025-26',
        }),
      ).rejects.toThrow('not found');
    });

    it('bulk-creates installments', async () => {
      const structure = makeFeeStructure();
      vi.mocked(structureRepo.findById).mockResolvedValue(structure);
      vi.mocked(installmentRepo.createMany).mockResolvedValue(2);

      const count = await service.bulkCreateInstallments({
        studentId: '22CSE001',
        semester: 1,
        academicYear: '2025-26',
        installments: [
          { feeStructureId: structure.id!, installmentNumber: 1, amount: 50000, dueDate: new Date() },
          { feeStructureId: structure.id!, installmentNumber: 2, amount: 50000, dueDate: new Date() },
        ],
      });
      expect(count).toBe(2);
    });

    it('throws when bulk installment references missing structure', async () => {
      vi.mocked(structureRepo.findById).mockResolvedValue(null);
      await expect(
        service.bulkCreateInstallments({
          studentId: '22CSE001',
          semester: 1,
          academicYear: '2025-26',
          installments: [{ feeStructureId: '507f1f77bcf86cd799439099', installmentNumber: 1, amount: 50000, dueDate: new Date() }],
        }),
      ).rejects.toThrow('not found');
    });
  });

  // ============================================================
  // PAYMENTS
  // ============================================================

  describe('Payments', () => {
    it('records a payment and generates a receipt', async () => {
      const installment = makeInstallment({ remainingAmount: 50000, paidAmount: 0 });
      const updatedInstallment = makeInstallment({ paidAmount: 25000, remainingAmount: 25000, status: 'partial' });
      const payment = makePayment();
      const receipt = makeReceipt();

      vi.mocked(installmentRepo.findById).mockResolvedValue(installment);
      vi.mocked(paymentRepo.getNextReceiptNumber).mockResolvedValue('RCP-202508-00001');
      vi.mocked(paymentRepo.create).mockResolvedValue(payment);
      vi.mocked(installmentRepo.recordPayment).mockResolvedValue(updatedInstallment);
      vi.mocked(receiptRepo.create).mockResolvedValue(receipt);

      const result = await service.recordPayment({
        studentId: '22CSE001',
        installmentId: installment.id!,
        amount: 25000,
        method: 'upi',
        transactionId: 'TXN123',
      });

      expect(result.payment.receiptNumber).toBe('RCP-202508-00001');
      expect(result.receipt.amount).toBe(25000);
      expect(result.installment.paidAmount).toBe(25000);
    });

    it('throws when installment does not exist', async () => {
      vi.mocked(installmentRepo.findById).mockResolvedValue(null);
      await expect(
        service.recordPayment({
          studentId: '22CSE001',
          installmentId: '507f1f77bcf86cd799439099',
          amount: 1000,
          method: 'cash',
        }),
      ).rejects.toThrow('not found');
    });

    it('throws when student does not match installment', async () => {
      const installment = makeInstallment({ studentId: 'OTHER_STUDENT' });
      vi.mocked(installmentRepo.findById).mockResolvedValue(installment);

      await expect(
        service.recordPayment({
          studentId: '22CSE001',
          installmentId: installment.id!,
          amount: 1000,
          method: 'cash',
        }),
      ).rejects.toThrow('Student does not match installment');
    });

    it('throws when payment amount is zero or negative', async () => {
      const installment = makeInstallment();
      vi.mocked(installmentRepo.findById).mockResolvedValue(installment);

      await expect(
        service.recordPayment({
          studentId: '22CSE001',
          installmentId: installment.id!,
          amount: 0,
          method: 'cash',
        }),
      ).rejects.toThrow('greater than zero');
    });

    it('throws when payment exceeds remaining', async () => {
      const installment = makeInstallment({ remainingAmount: 1000 });
      vi.mocked(installmentRepo.findById).mockResolvedValue(installment);

      await expect(
        service.recordPayment({
          studentId: '22CSE001',
          installmentId: installment.id!,
          amount: 5000,
          method: 'cash',
        }),
      ).rejects.toThrow('exceeds remaining');
    });

    it('refunds a payment', async () => {
      const payment = makePayment({ status: 'refunded' });
      vi.mocked(paymentRepo.refundPayment).mockResolvedValue(payment);
      const result = await service.refundPayment(payment.id!);
      expect(result.status).toBe('refunded');
    });

    it('throws when refunding a missing payment', async () => {
      vi.mocked(paymentRepo.refundPayment).mockResolvedValue(null);
      await expect(service.refundPayment('507f1f77bcf86cd799439099')).rejects.toThrow('not found');
    });
  });

  // ============================================================
  // PENDING AMOUNT
  // ============================================================

  describe('Pending Amount', () => {
    it('returns pending summary', async () => {
      const summary = makePendingSummary();
      vi.mocked(pendingRepo.getPendingSummary).mockResolvedValue(summary);

      const result = await service.getPendingSummary('22CSE001', 1, '2025-26');
      expect(result.netPayable).toBe(25000);
      expect(result.installmentCount).toBe(1);
    });
  });

  // ============================================================
  // PAYMENT HISTORY
  // ============================================================

  describe('Payment History', () => {
    it('returns payment history with aggregates', async () => {
      const history = makePaymentHistory({
        totalPaid: 25000,
        netPaid: 25000,
        totalTransactions: 1,
        byMethod: { cash: 0, card: 0, upi: 25000, netbanking: 0, cheque: 0, dd: 0, online: 0 },
      });
      vi.mocked(paymentRepo.getPaymentHistory).mockResolvedValue(history);

      const result = await service.getPaymentHistory('22CSE001');
      expect(result.totalPaid).toBe(25000);
      expect(result.byMethod.upi).toBe(25000);
    });
  });

  // ============================================================
  // SCHOLARSHIPS
  // ============================================================

  describe('Scholarships', () => {
    it('creates a scholarship', async () => {
      const scholarship = makeScholarship();
      vi.mocked(scholarshipRepo.create).mockResolvedValue(scholarship);

      const result = await service.createScholarship({
        studentId: '22CSE001',
        scholarshipName: 'Merit Scholarship',
        type: 'merit',
        amount: 10000,
        percentage: 20,
        provider: 'Government',
        validFrom: scholarship.validFrom,
        validUntil: scholarship.validUntil,
        semester: 1,
        academicYear: '2025-26',
      });
      expect(result.status).toBe('active');
    });

    it('throws when validUntil is before validFrom', async () => {
      await expect(
        service.createScholarship({
          studentId: '22CSE001',
          scholarshipName: 'Test',
          type: 'merit',
          amount: 1000,
          provider: 'Test',
          validFrom: new Date('2025-06-01'),
          validUntil: new Date('2025-01-01'),
          academicYear: '2025-26',
        }),
      ).rejects.toThrow('validUntil must be after validFrom');
    });

    it('throws when percentage out of range', async () => {
      await expect(
        service.createScholarship({
          studentId: '22CSE001',
          scholarshipName: 'Test',
          type: 'merit',
          amount: 1000,
          percentage: 150,
          provider: 'Test',
          validFrom: new Date('2025-01-01'),
          validUntil: new Date('2025-12-31'),
          academicYear: '2025-26',
        }),
      ).rejects.toThrow('between 0 and 100');
    });

    it('revokes a scholarship', async () => {
      const scholarship = makeScholarship({ status: 'revoked' });
      vi.mocked(scholarshipRepo.revokeScholarship).mockResolvedValue(scholarship);

      const result = await service.revokeScholarship(scholarship.id!, 'Misuse');
      expect(result.status).toBe('revoked');
    });

    it('throws when revoking missing scholarship', async () => {
      vi.mocked(scholarshipRepo.revokeScholarship).mockResolvedValue(null);
      await expect(service.revokeScholarship('507f1f77bcf86cd799439099', 'Test')).rejects.toThrow('not found');
    });
  });

  // ============================================================
  // FINES
  // ============================================================

  describe('Fines', () => {
    it('creates a fine', async () => {
      const fine = makeFine();
      vi.mocked(fineRepo.create).mockResolvedValue(fine);

      const result = await service.createFine({
        studentId: '22CSE001',
        reason: 'late_payment',
        description: 'Late fee payment',
        amount: 500,
        dueDate: fine.dueDate,
        semester: 1,
        academicYear: '2025-26',
      });
      expect(result.status).toBe('pending');
    });

    it('throws when fine amount is zero', async () => {
      await expect(
        service.createFine({
          studentId: '22CSE001',
          reason: 'late_payment',
          description: 'Test',
          amount: 0,
          dueDate: new Date(),
          semester: 1,
          academicYear: '2025-26',
        }),
      ).rejects.toThrow('greater than zero');
    });

    it('waives a fine partially', async () => {
      const existing = makeFine({ remainingAmount: 500 });
      const fine = makeFine({ id: existing.id, waivedAmount: 200, netAmount: 300, remainingAmount: 300, status: 'pending' });
      vi.mocked(fineRepo.findById).mockResolvedValue(existing);
      vi.mocked(fineRepo.waive).mockResolvedValue(fine);

      const result = await service.waiveFine(fine.id!, 'admin', 'Good student', 200);
      expect(result.netAmount).toBe(300);
    });

    it('waives a fine fully (defaults to remaining)', async () => {
      const existing = makeFine({ remainingAmount: 500 });
      const fine = makeFine({ id: existing.id, status: 'waived', netAmount: 0, remainingAmount: 0, waivedAmount: 500 });
      vi.mocked(fineRepo.findById).mockResolvedValue(existing);
      vi.mocked(fineRepo.waive).mockResolvedValue(fine);

      const result = await service.waiveFine(fine.id!, 'admin', 'Good student');
      expect(result.status).toBe('waived');
    });

    it('throws when waive amount exceeds remaining', async () => {
      const fine = makeFine({ remainingAmount: 100 });
      vi.mocked(fineRepo.findById).mockResolvedValue(fine);

      await expect(service.waiveFine(fine.id!, 'admin', 'Test', 200)).rejects.toThrow('exceeds remaining');
    });

    it('records fine payment', async () => {
      const fine = makeFine({ paidAmount: 200, remainingAmount: 300, status: 'partial' });
      vi.mocked(fineRepo.findById).mockResolvedValue(makeFine({ remainingAmount: 500 }));
      vi.mocked(fineRepo.recordPayment).mockResolvedValue(fine);

      const result = await service.recordFinePayment({
        fineId: fine.id!,
        amount: 200,
        method: 'cash',
      });
      expect(result.status).toBe('partial');
    });

    it('throws when fine payment exceeds remaining', async () => {
      const fine = makeFine({ remainingAmount: 100 });
      vi.mocked(fineRepo.findById).mockResolvedValue(fine);

      await expect(
        service.recordFinePayment({ fineId: fine.id!, amount: 500, method: 'cash' }),
      ).rejects.toThrow('exceeds remaining');
    });
  });

  // ============================================================
  // DUE-REMINDER NOTIFICATIONS
  // ============================================================

  describe('Due Reminders', () => {
    it('sends reminders for overdue installments of a single student', async () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      vi.mocked(installmentRepo.findByStudentAndSemester).mockResolvedValue([
        makeInstallment({ status: 'overdue', dueDate: past, remainingAmount: 25000 }),
        makeInstallment({ status: 'upcoming', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), installmentNumber: 2, remainingAmount: 25000 }),
        makeInstallment({ status: 'paid', paidAmount: 50000, remainingAmount: 0, installmentNumber: 3 }),
      ]);

      const result = await service.sendDueRemindersForStudent('22CSE001', 1, '2025-26');
      expect(result.remindersSent).toBe(1);
      expect(result.totalOverdue).toBe(1);
      expect(reminderService.createFeeReminder).toHaveBeenCalledTimes(1);
    });

    it('sends no reminders when no reminder service is configured', async () => {
      const serviceWithoutReminders = new FeeService(
        legacyRepo, structureRepo, installmentRepo, paymentRepo, receiptRepo,
        scholarshipRepo, fineRepo, pendingRepo, undefined, undefined,
      );
      const result = await serviceWithoutReminders.sendDueRemindersForStudent('22CSE001', 1, '2025-26');
      expect(result.remindersSent).toBe(0);
    });

    it('sends reminders for all students', async () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      vi.mocked(installmentRepo.findOverdueByDate).mockResolvedValue([
        makeInstallment({ studentId: 'S1', status: 'overdue', dueDate: past, remainingAmount: 10000 }),
        makeInstallment({ studentId: 'S2', status: 'overdue', dueDate: past, remainingAmount: 20000, installmentNumber: 2 }),
      ]);
      vi.mocked(installmentRepo.findByStudentAndSemester).mockImplementation(async (sid) => [
        makeInstallment({ studentId: sid, status: 'overdue', dueDate: past, remainingAmount: sid === 'S1' ? 10000 : 20000 }),
      ]);

      const result = await service.sendDueRemindersForAllStudents(1, '2025-26');
      expect(result.studentsProcessed).toBe(2);
      expect(result.totalReminders).toBe(2);
    });
  });
});