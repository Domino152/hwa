import type { IFeeRepository } from '../../repositories/fee.repository.js';
import type { FeeResult } from '../types.js';

export class FeeIntegrationService {
  constructor(private readonly repo: IFeeRepository) {}

  async getByStudentId(studentId: string): Promise<FeeResult> {
    const fee = await this.repo.findLatestFeeByStudentId(studentId);

    if (!fee) {
      return { fee: null, hasData: false };
    }

    return {
      fee: {
        totalFee: fee.totalFee,
        paidAmount: fee.paidAmount,
        remainingAmount: fee.remainingAmount,
        dueDate: fee.dueDate,
        feeType: fee.feeType,
        status: fee.status,
      },
      hasData: true,
    };
  }
}
