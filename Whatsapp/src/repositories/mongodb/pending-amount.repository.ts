import { Installment } from '../../database/models/Installment.js';
import { Scholarship } from '../../database/models/Scholarship.js';
import { Fine } from '../../database/models/Fine.js';
import type { PendingAmountRecord } from '../types.js';
import type { IPendingAmountRepository } from '../fee.repository.js';

export class MongoPendingAmountRepository implements IPendingAmountRepository {
  async getPendingSummary(studentId: string, semester: number, academicYear: string): Promise<PendingAmountRecord> {
    const now = new Date();

    const installmentResults = await Installment.aggregate([
      {
        $match: {
          studentId,
          semester,
          academicYear,
          status: { $in: ['upcoming', 'due', 'overdue', 'partial'] },
        },
      },
      {
        $group: {
          _id: null,
          totalRemaining: { $sum: '$remainingAmount' },
          installmentCount: { $sum: 1 },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$dueDate', now] },
                    { $ne: ['$status', 'paid'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          overdueAmount: {
            $sum: {
              $cond: [
                { $lt: ['$dueDate', now] },
                '$remainingAmount',
                0,
              ],
            },
          },
          upcomingAmount: {
            $sum: {
              $cond: [
                { $gte: ['$dueDate', now] },
                '$remainingAmount',
                0,
              ],
            },
          },
        },
      },
    ]);

    const scholarshipResults = await Scholarship.aggregate([
      {
        $match: {
          studentId,
          academicYear,
          status: 'active',
          validFrom: { $lte: now },
          validUntil: { $gte: now },
          $or: [{ semester }, { semester: null }],
        },
      },
      {
        $group: {
          _id: null,
          totalCredit: { $sum: { $subtract: ['$amount', '$appliedAmount'] } },
        },
      },
    ]);

    const fineAmount = await Fine.aggregate([
      {
        $match: {
          studentId,
          semester,
          academicYear,
          status: { $in: ['pending', 'partial'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$remainingAmount' },
        },
      },
    ]);

    const nextInstallment = await Installment.findOne({
      studentId,
      semester,
      academicYear,
      status: { $in: ['upcoming', 'due', 'partial'] },
      remainingAmount: { $gt: 0 },
    })
      .sort({ dueDate: 1 })
      .select('dueDate remainingAmount');

    const inst = installmentResults[0] as
      | { totalRemaining: number; installmentCount: number; overdueCount: number; overdueAmount: number; upcomingAmount: number }
      | undefined;

    const scholarshipCredit =
      (scholarshipResults[0] as { totalCredit: number } | undefined)?.totalCredit ?? 0;
    const fineAmt = (fineAmount[0] as { total: number } | undefined)?.total ?? 0;

    const totalPending = inst?.totalRemaining ?? 0;
    const netPayable = Math.max(0, totalPending + fineAmt - scholarshipCredit);

    return {
      studentId,
      totalPending,
      overdueAmount: inst?.overdueAmount ?? 0,
      upcomingAmount: inst?.upcomingAmount ?? 0,
      fineAmount: fineAmt,
      scholarshipCredit,
      netPayable,
      installmentCount: inst?.installmentCount ?? 0,
      overdueCount: inst?.overdueCount ?? 0,
      nextDueDate: nextInstallment?.dueDate ?? null,
      nextDueAmount: nextInstallment?.remainingAmount ?? null,
    };
  }
}