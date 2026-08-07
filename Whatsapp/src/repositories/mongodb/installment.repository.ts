import { Installment } from '../../database/models/Installment.js';
import type { InstallmentRecord, InstallmentStatus, FeeCategory } from '../types.js';
import type { IInstallmentRepository } from '../fee.repository.js';

function toRecord(doc: {
  _id: { toString(): string };
  installmentNumber: number;
  studentId: string;
  feeStructureId: { toString(): string };
  feeCode: string;
  feeName: string;
  category: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  paidDate: Date | null;
  status: string;
  semester: number;
  academicYear: string;
  lateFine: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): InstallmentRecord {
  return {
    id: doc._id.toString(),
    installmentNumber: doc.installmentNumber,
    studentId: doc.studentId,
    feeStructureId: doc.feeStructureId.toString(),
    feeCode: doc.feeCode,
    feeName: doc.feeName,
    category: doc.category as FeeCategory,
    amount: doc.amount,
    paidAmount: doc.paidAmount,
    remainingAmount: doc.remainingAmount,
    dueDate: doc.dueDate,
    paidDate: doc.paidDate,
    status: doc.status as InstallmentStatus,
    semester: doc.semester,
    academicYear: doc.academicYear,
    lateFine: doc.lateFine,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoInstallmentRepository implements IInstallmentRepository {
  async create(record: Omit<InstallmentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<InstallmentRecord> {
    const doc = await Installment.create(record);
    return toRecord(doc);
  }

  async createMany(records: Array<Omit<InstallmentRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> {
    if (records.length === 0) return 0;
    const result = await Installment.insertMany(records, { ordered: false });
    return result.length;
  }

  async findById(id: string): Promise<InstallmentRecord | null> {
    const doc = await Installment.findById(id);
    return doc ? toRecord(doc) : null;
  }

  async findByStudent(studentId: string, academicYear?: string): Promise<InstallmentRecord[]> {
    const query: Record<string, unknown> = { studentId };
    if (academicYear) query.academicYear = academicYear;
    const docs = await Installment.find(query).sort({ dueDate: 1 });
    return docs.map(toRecord);
  }

  async findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<InstallmentRecord[]> {
    const docs = await Installment.find({ studentId, semester, academicYear }).sort({ dueDate: 1 });
    return docs.map(toRecord);
  }

  async findByStudentSemesterCategory(
    studentId: string,
    semester: number,
    academicYear: string,
    category: string,
  ): Promise<InstallmentRecord | null> {
    const doc = await Installment.findOne({ studentId, semester, academicYear, category });
    return doc ? toRecord(doc) : null;
  }

  async findOverdueByDate(before: Date): Promise<InstallmentRecord[]> {
    const docs = await Installment.find({
      status: { $in: ['upcoming', 'due', 'partial'] },
      dueDate: { $lt: before },
    });
    return docs.map(toRecord);
  }

  async findDueByDate(before: Date): Promise<InstallmentRecord[]> {
    const docs = await Installment.find({
      status: { $in: ['upcoming', 'partial'] },
      dueDate: { $lte: before, $gte: new Date(0) },
    });
    return docs.map(toRecord);
  }

  async update(id: string, update: Partial<InstallmentRecord>): Promise<InstallmentRecord | null> {
    const doc = await Installment.findByIdAndUpdate(id, { $set: update }, { new: true });
    return doc ? toRecord(doc) : null;
  }

  async recordPayment(id: string, amount: number, paidDate: Date): Promise<InstallmentRecord | null> {
    const doc = await Installment.findById(id);
    if (!doc) return null;

    const newPaidAmount = doc.paidAmount + amount;
    const newRemaining = Math.max(0, doc.amount - newPaidAmount);
    const newStatus: InstallmentStatus =
      newRemaining === 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : doc.status;

    const updated = await Installment.findByIdAndUpdate(
      id,
      {
        $set: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemaining,
          status: newStatus,
          paidDate: newRemaining === 0 ? paidDate : doc.paidDate,
        },
      },
      { new: true },
    );
    return updated ? toRecord(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Installment.findByIdAndDelete(id);
    return result !== null;
  }

  async deleteByStudentFee(studentId: string, feeStructureId: string): Promise<number> {
    const result = await Installment.deleteMany({ studentId, feeStructureId });
    return result.deletedCount ?? 0;
  }
}