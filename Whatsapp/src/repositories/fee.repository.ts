import type { FeeRecord } from './types.js';

export interface IFeeRepository {
  findLatestFeeByStudentId(studentId: string): Promise<FeeRecord | null>;
  findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<FeeRecord[]>;
  findByStudentAll(studentId: string): Promise<FeeRecord[]>;
  updatePayment(studentId: string, feeType: string, semester: number, academicYear: string, paidAmount: number): Promise<FeeRecord | null>;
  findOverdueFees(academicYear: string): Promise<FeeRecord[]>;
  getDepartmentFeeSummary(department: string, semester: number, academicYear: string): Promise<{ totalStudents: number; paidCount: number; partialCount: number; pendingCount: number; totalCollected: number; totalPending: number }>;
}
