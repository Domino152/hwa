import { Fee } from '../../database/models/Fee.js';
import type { IFeeRepository } from '../fee.repository.js';
import type { FeeRecord } from '../types.js';

function toRecord(doc: { studentId: string; feeType: string; totalFee: number; paidAmount: number; remainingAmount: number; dueDate: Date; status: 'paid' | 'partial' | 'pending'; semester: number; academicYear: string }): FeeRecord {
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

export class MongoFeeRepository implements IFeeRepository {
  async findLatestFeeByStudentId(studentId: string): Promise<FeeRecord | null> {
    const doc = await Fee.findOne({ studentId }).sort({ createdAt: -1 });
    return doc ? toRecord(doc) : null;
  }

  async findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<FeeRecord[]> {
    const docs = await Fee.find({ studentId, semester, academicYear }).sort({ createdAt: -1 });
    return docs.map(toRecord);
  }

  async findByStudentAll(studentId: string): Promise<FeeRecord[]> {
    const docs = await Fee.find({ studentId }).sort({ semester: -1, createdAt: -1 });
    return docs.map(toRecord);
  }

  async updatePayment(studentId: string, feeType: string, semester: number, academicYear: string, paidAmount: number): Promise<FeeRecord | null> {
    const doc = await Fee.findOneAndUpdate(
      { studentId, feeType, semester, academicYear },
      {
        $set: {
          paidAmount,
          remainingAmount: Math.max(0, (await Fee.findOne({ studentId, feeType, semester, academicYear }))?.totalFee ?? 0) - paidAmount,
          status: paidAmount >= ((await Fee.findOne({ studentId, feeType, semester, academicYear }))?.totalFee ?? 0) ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
        },
      },
      { new: true },
    );
    return doc ? toRecord(doc) : null;
  }

  async findOverdueFees(academicYear: string): Promise<FeeRecord[]> {
    const docs = await Fee.find({
      academicYear,
      status: { $in: ['pending', 'partial'] },
      dueDate: { $lt: new Date() },
    }).sort({ dueDate: 1 });
    return docs.map(toRecord);
  }

  async getDepartmentFeeSummary(department: string, semester: number, academicYear: string): Promise<{ totalStudents: number; paidCount: number; partialCount: number; pendingCount: number; totalCollected: number; totalPending: number }> {
    const results = await Fee.aggregate([
      { $match: { semester, academicYear } },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: 'studentId',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      { $match: { 'student.department': department, 'student.isActive': true } },
      {
        $group: {
          _id: '$studentId',
          status: { $first: '$status' },
          paidAmount: { $first: '$paidAmount' },
          remainingAmount: { $first: '$remainingAmount' },
        },
      },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          partialCount: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          totalCollected: { $sum: '$paidAmount' },
          totalPending: { $sum: '$remainingAmount' },
        },
      },
    ]);

    if (results.length === 0) {
      return { totalStudents: 0, paidCount: 0, partialCount: 0, pendingCount: 0, totalCollected: 0, totalPending: 0 };
    }

    const r = results[0]!;
    return {
      totalStudents: r.totalStudents as number,
      paidCount: r.paidCount as number,
      partialCount: r.partialCount as number,
      pendingCount: r.pendingCount as number,
      totalCollected: r.totalCollected as number,
      totalPending: r.totalPending as number,
    };
  }
}
