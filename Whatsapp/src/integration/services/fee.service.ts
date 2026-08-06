import { Fee } from '../../database/models/Fee.js';
import type { FeeResult } from '../types.js';

export class FeeIntegrationService {
  async getByStudentId(studentId: string): Promise<FeeResult> {
    const fee = await Fee.findOne({ studentId }).sort({ createdAt: -1 });

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
