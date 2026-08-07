import { Receipt } from '../../database/models/Receipt.js';
import type { ReceiptRecord, PaymentMethod } from '../types.js';
import type { IReceiptRepository } from '../fee.repository.js';

function toRecord(doc: {
  _id: { toString(): string };
  receiptNumber: string;
  studentId: string;
  studentName: string;
  paymentId: { toString(): string };
  installmentId: { toString(): string };
  feeCode: string;
  feeName: string;
  amount: number;
  totalPaid: number;
  remainingAmount: number;
  method: string;
  transactionId: string | null;
  semester: number;
  academicYear: string;
  generatedAt: Date;
  collectedBy: string | null;
  notes: string | null;
}): ReceiptRecord {
  return {
    id: doc._id.toString(),
    receiptNumber: doc.receiptNumber,
    studentId: doc.studentId,
    studentName: doc.studentName,
    paymentId: doc.paymentId.toString(),
    installmentId: doc.installmentId.toString(),
    feeCode: doc.feeCode,
    feeName: doc.feeName,
    amount: doc.amount,
    totalPaid: doc.totalPaid,
    remainingAmount: doc.remainingAmount,
    method: doc.method as PaymentMethod,
    transactionId: doc.transactionId,
    semester: doc.semester,
    academicYear: doc.academicYear,
    generatedAt: doc.generatedAt,
    collectedBy: doc.collectedBy,
    notes: doc.notes,
  };
}

export class MongoReceiptRepository implements IReceiptRepository {
  async create(record: Omit<ReceiptRecord, 'id'>): Promise<ReceiptRecord> {
    const doc = await Receipt.create(record);
    return toRecord(doc);
  }

  async findByReceiptNumber(receiptNumber: string): Promise<ReceiptRecord | null> {
    const doc = await Receipt.findOne({ receiptNumber });
    return doc ? toRecord(doc) : null;
  }

  async findByStudent(studentId: string, limit = 50): Promise<ReceiptRecord[]> {
    const docs = await Receipt.find({ studentId }).sort({ generatedAt: -1 }).limit(limit);
    return docs.map(toRecord);
  }

  async findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<ReceiptRecord[]> {
    const docs = await Receipt.find({ studentId, semester, academicYear }).sort({ generatedAt: -1 });
    return docs.map(toRecord);
  }
}