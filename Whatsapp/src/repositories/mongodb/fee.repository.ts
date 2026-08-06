import { Fee } from '../../database/models/Fee.js';
import type { IFeeRepository } from '../fee.repository.js';
import type { FeeRecord } from '../types.js';

export class MongoFeeRepository implements IFeeRepository {
  async findLatestFeeByStudentId(studentId: string): Promise<FeeRecord | null> {
    const doc = await Fee.findOne({ studentId }).sort({ createdAt: -1 });
    if (!doc) return null;

    return {
      studentId: doc.studentId,
      feeType: doc.feeType,
      totalFee: doc.totalFee,
      paidAmount: doc.paidAmount,
      remainingAmount: doc.remainingAmount,
      dueDate: doc.dueDate,
      status: doc.status,
      semester: doc.semester,
      academicYear: doc.academicYear,
    };
  }
}
