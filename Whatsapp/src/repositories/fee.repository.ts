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
} from './types.js';

export interface IFeeRepository {
  findLatestFeeByStudentId(studentId: string): Promise<FeeRecord | null>;
  findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<FeeRecord[]>;
  findByStudentAll(studentId: string): Promise<FeeRecord[]>;
  updatePayment(studentId: string, feeType: string, semester: number, academicYear: string, paidAmount: number): Promise<FeeRecord | null>;
  findOverdueFees(academicYear: string): Promise<FeeRecord[]>;
  getDepartmentFeeSummary(
    department: string,
    semester: number,
    academicYear: string,
  ): Promise<{
    totalStudents: number;
    paidCount: number;
    partialCount: number;
    pendingCount: number;
    totalCollected: number;
    totalPending: number;
  }>;
}

export interface IFeeStructureRepository {
  create(record: Omit<FeeStructureRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeeStructureRecord>;
  findByCode(code: string, academicYear: string): Promise<FeeStructureRecord | null>;
  findById(id: string): Promise<FeeStructureRecord | null>;
  findByDepartmentProgram(department: string, program: string, academicYear: string): Promise<FeeStructureRecord[]>;
  findByDepartmentSemester(department: string, semester: number, academicYear: string): Promise<FeeStructureRecord[]>;
  findAll(filter: { department?: string; academicYear?: string; isActive?: boolean }): Promise<FeeStructureRecord[]>;
  update(id: string, update: Partial<FeeStructureRecord>): Promise<FeeStructureRecord | null>;
  delete(id: string): Promise<boolean>;
}

export interface IInstallmentRepository {
  create(record: Omit<InstallmentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<InstallmentRecord>;
  createMany(records: Array<Omit<InstallmentRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number>;
  findById(id: string): Promise<InstallmentRecord | null>;
  findByStudent(studentId: string, academicYear?: string): Promise<InstallmentRecord[]>;
  findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<InstallmentRecord[]>;
  findByStudentSemesterCategory(
    studentId: string,
    semester: number,
    academicYear: string,
    category: string,
  ): Promise<InstallmentRecord | null>;
  findOverdueByDate(before: Date): Promise<InstallmentRecord[]>;
  findDueByDate(before: Date): Promise<InstallmentRecord[]>;
  update(id: string, update: Partial<InstallmentRecord>): Promise<InstallmentRecord | null>;
  recordPayment(id: string, amount: number, paidDate: Date): Promise<InstallmentRecord | null>;
  delete(id: string): Promise<boolean>;
  deleteByStudentFee(studentId: string, feeStructureId: string): Promise<number>;
}

export interface IPaymentRepository {
  create(record: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<PaymentRecord>;
  findByReceiptNumber(receiptNumber: string): Promise<PaymentRecord | null>;
  findByStudent(studentId: string, limit?: number): Promise<PaymentRecord[]>;
  findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<PaymentRecord[]>;
  findByInstallment(installmentId: string): Promise<PaymentRecord[]>;
  updateStatus(id: string, status: PaymentRecord['status']): Promise<PaymentRecord | null>;
  refundPayment(id: string): Promise<PaymentRecord | null>;
  getPaymentHistory(studentId: string): Promise<PaymentHistoryRecord>;
  getNextReceiptNumber(): Promise<string>;
}

export interface IReceiptRepository {
  create(record: Omit<ReceiptRecord, 'id'>): Promise<ReceiptRecord>;
  findByReceiptNumber(receiptNumber: string): Promise<ReceiptRecord | null>;
  findByStudent(studentId: string, limit?: number): Promise<ReceiptRecord[]>;
  findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<ReceiptRecord[]>;
}

export interface IScholarshipRepository {
  create(record: Omit<ScholarshipRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScholarshipRecord>;
  findById(id: string): Promise<ScholarshipRecord | null>;
  findByStudent(studentId: string, academicYear?: string): Promise<ScholarshipRecord[]>;
  findActiveByStudent(studentId: string, semester: number, academicYear: string): Promise<ScholarshipRecord[]>;
  update(id: string, update: Partial<ScholarshipRecord>): Promise<ScholarshipRecord | null>;
  delete(id: string): Promise<boolean>;
  applyScholarship(id: string, amount: number): Promise<ScholarshipRecord | null>;
  revokeScholarship(id: string, reason: string): Promise<ScholarshipRecord | null>;
}

export interface IFineRepository {
  create(record: Omit<FineRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<FineRecord>;
  findById(id: string): Promise<FineRecord | null>;
  findByStudent(studentId: string, academicYear?: string): Promise<FineRecord[]>;
  findActiveByStudent(studentId: string, semester: number, academicYear: string): Promise<FineRecord[]>;
  waive(id: string, waivedBy: string, reason: string, waivedAmount: number): Promise<FineRecord | null>;
  recordPayment(id: string, amount: number): Promise<FineRecord | null>;
  delete(id: string): Promise<boolean>;
  sumUnpaidByStudent(studentId: string, semester: number, academicYear: string): Promise<number>;
}

export interface IPendingAmountRepository {
  getPendingSummary(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<PendingAmountRecord>;
}