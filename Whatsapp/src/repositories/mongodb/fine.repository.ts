import { Fine } from '../../database/models/Fine.js';
import type { FineRecord, FineReason } from '../types.js';
import type { IFineRepository } from '../fee.repository.js';

function toRecord(doc: {
  _id: { toString(): string };
  studentId: string;
  reason: string;
  description: string;
  amount: number;
  waivedAmount: number;
  netAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  paidDate: Date | null;
  status: string;
  installmentId: { toString(): string } | null;
  semester: number;
  academicYear: string;
  imposedBy: string | null;
  waivedBy: string | null;
  waiverReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): FineRecord {
  return {
    id: doc._id.toString(),
    studentId: doc.studentId,
    reason: doc.reason as FineReason,
    description: doc.description,
    amount: doc.amount,
    waivedAmount: doc.waivedAmount,
    netAmount: doc.netAmount,
    paidAmount: doc.paidAmount,
    remainingAmount: doc.remainingAmount,
    dueDate: doc.dueDate,
    paidDate: doc.paidDate,
    status: doc.status as FineRecord['status'],
    installmentId: doc.installmentId ? doc.installmentId.toString() : null,
    semester: doc.semester,
    academicYear: doc.academicYear,
    imposedBy: doc.imposedBy,
    waivedBy: doc.waivedBy,
    waiverReason: doc.waiverReason,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoFineRepository implements IFineRepository {
  async create(record: Omit<FineRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<FineRecord> {
    const doc = await Fine.create(record);
    return toRecord(doc);
  }

  async findById(id: string): Promise<FineRecord | null> {
    const doc = await Fine.findById(id);
    return doc ? toRecord(doc) : null;
  }

  async findByStudent(studentId: string, academicYear?: string): Promise<FineRecord[]> {
    const query: Record<string, unknown> = { studentId };
    if (academicYear) query.academicYear = academicYear;
    const docs = await Fine.find(query).sort({ dueDate: 1 });
    return docs.map(toRecord);
  }

  async findActiveByStudent(studentId: string, semester: number, academicYear: string): Promise<FineRecord[]> {
    const docs = await Fine.find({
      studentId,
      semester,
      academicYear,
      status: { $in: ['pending', 'partial'] },
    }).sort({ dueDate: 1 });
    return docs.map(toRecord);
  }

  async waive(id: string, waivedBy: string, reason: string, waivedAmount: number): Promise<FineRecord | null> {
    const doc = await Fine.findById(id);
    if (!doc) return null;

    const newWaived = doc.waivedAmount + waivedAmount;
    const newNet = doc.amount - newWaived;
    const newStatus =
      newNet <= 0 ? 'waived' : doc.paidAmount >= newNet ? 'paid' : doc.status;

    const updated = await Fine.findByIdAndUpdate(
      id,
      {
        $set: {
          waivedAmount: newWaived,
          netAmount: Math.max(0, newNet),
          remainingAmount: Math.max(0, newNet - doc.paidAmount),
          status: newStatus,
          waivedBy,
          waiverReason: reason,
        },
      },
      { new: true },
    );
    return updated ? toRecord(updated) : null;
  }

  async recordPayment(id: string, amount: number): Promise<FineRecord | null> {
    const doc = await Fine.findById(id);
    if (!doc) return null;

    const newPaid = doc.paidAmount + amount;
    const newRemaining = Math.max(0, doc.netAmount - newPaid);
    const newStatus =
      newRemaining === 0 ? 'paid' : newPaid > 0 ? 'partial' : doc.status;

    const updated = await Fine.findByIdAndUpdate(
      id,
      {
        $set: {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          status: newStatus,
          paidDate: newRemaining === 0 ? new Date() : doc.paidDate,
        },
      },
      { new: true },
    );
    return updated ? toRecord(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Fine.findByIdAndDelete(id);
    return result !== null;
  }

  async sumUnpaidByStudent(studentId: string, semester: number, academicYear: string): Promise<number> {
    const result = await Fine.aggregate([
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

    if (result.length === 0) return 0;
    return (result[0] as { total: number }).total;
  }
}