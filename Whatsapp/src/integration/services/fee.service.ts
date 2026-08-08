import { FeePayment, type IFeePayment } from '../../database/models/FeePayment.js';
import type { FeeResult } from '../types.js';

export class FeeIntegrationService {
  async getByStudentId(studentId: string): Promise<FeeResult> {
    const fee = await FeePayment.findOne({ studentId }).sort({ createdAt: -1 }) as unknown as IFeePayment | null;

    if (!fee) {
      return { fee: null, hasData: false };
    }

    return {
      fee: {
        totalFee: fee.totalAmount,
        paidAmount: fee.paidAmount,
        remainingAmount: fee.remainingAmount,
        dueDate: fee.installments.length > 0 ? fee.installments[0]!.dueDate : new Date(),
        feeType: fee.feeName,
        status: fee.status === 'paid' ? 'paid' : fee.status === 'partial' ? 'partial' : 'pending',
      },
      hasData: true,
    };
  }
}
