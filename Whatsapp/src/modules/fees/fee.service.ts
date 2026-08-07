import type { IFeeRepository } from '../../repositories/fee.repository.js';
import { NotFoundError } from '../../shared/utils/errors.js';

export class FeeService {
  constructor(private readonly repo: IFeeRepository) {}

  async getByStudentId(studentId: string) {
    return this.repo.findLatestFeeByStudentId(studentId);
  }

  async getByStudentAll(studentId: string) {
    return this.repo.findByStudentAll(studentId);
  }

  async getByStudentAndSemester(studentId: string, semester: number, academicYear: string) {
    return this.repo.findByStudentAndSemester(studentId, semester, academicYear);
  }

  async updatePayment(studentId: string, feeType: string, semester: number, academicYear: string, paidAmount: number) {
    const existing = await this.repo.findByStudentAndSemester(studentId, semester, academicYear);
    const fee = existing.find((f) => f.feeType === feeType);
    if (!fee) throw new NotFoundError('Fee record');
    return this.repo.updatePayment(studentId, feeType, semester, academicYear, paidAmount);
  }

  async getOverdueFees(academicYear: string) {
    return this.repo.findOverdueFees(academicYear);
  }

  async getDepartmentSummary(department: string, semester: number, academicYear: string) {
    return this.repo.getDepartmentFeeSummary(department, semester, academicYear);
  }
}
