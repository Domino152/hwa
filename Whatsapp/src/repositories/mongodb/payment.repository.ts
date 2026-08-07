import { Payment } from '../../database/models/Payment.js';
import type { PaymentRecord, PaymentMethod, PaymentStatus, PaymentHistoryRecord } from '../types.js';
import type { IPaymentRepository } from '../fee.repository.js';

function toRecord(doc: {
  _id: { toString(): string };
  receiptNumber: string;
  studentId: string;
  installmentId: { toString(): string };
  feeStructureId: { toString(): string };
  amount: number;
  method: string;
  transactionId: string | null;
  status: string;
  semester: number;
  academicYear: string;
  paidAt: Date;
  collectedBy: string | null;
  remarks: string | null;
  createdAt: Date;
}): PaymentRecord {
  return {
    id: doc._id.toString(),
    receiptNumber: doc.receiptNumber,
    studentId: doc.studentId,
    installmentId: doc.installmentId.toString(),
    feeStructureId: doc.feeStructureId.toString(),
    amount: doc.amount,
    method: doc.method as PaymentMethod,
    transactionId: doc.transactionId,
    status: doc.status as PaymentStatus,
    semester: doc.semester,
    academicYear: doc.academicYear,
    paidAt: doc.paidAt,
    collectedBy: doc.collectedBy,
    remarks: doc.remarks,
    createdAt: doc.createdAt,
  };
}

export class MongoPaymentRepository implements IPaymentRepository {
  async create(record: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<PaymentRecord> {
    const doc = await Payment.create(record);
    return toRecord(doc);
  }

  async findByReceiptNumber(receiptNumber: string): Promise<PaymentRecord | null> {
    const doc = await Payment.findOne({ receiptNumber });
    return doc ? toRecord(doc) : null;
  }

  async findByStudent(studentId: string, limit = 50): Promise<PaymentRecord[]> {
    const docs = await Payment.find({ studentId }).sort({ paidAt: -1 }).limit(limit);
    return docs.map(toRecord);
  }

  async findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<PaymentRecord[]> {
    const docs = await Payment.find({ studentId, semester, academicYear }).sort({ paidAt: -1 });
    return docs.map(toRecord);
  }

  async findByInstallment(installmentId: string): Promise<PaymentRecord[]> {
    const docs = await Payment.find({ installmentId }).sort({ paidAt: -1 });
    return docs.map(toRecord);
  }

  async updateStatus(id: string, status: PaymentStatus): Promise<PaymentRecord | null> {
    const doc = await Payment.findByIdAndUpdate(id, { $set: { status } }, { new: true });
    return doc ? toRecord(doc) : null;
  }

  async refundPayment(id: string): Promise<PaymentRecord | null> {
    const doc = await Payment.findByIdAndUpdate(id, { $set: { status: 'refunded' } }, { new: true });
    return doc ? toRecord(doc) : null;
  }

  async getPaymentHistory(studentId: string): Promise<PaymentHistoryRecord> {
    const payments = await Payment.find({ studentId, status: { $in: ['completed', 'refunded'] } }).sort({ paidAt: -1 });
    const records = payments.map(toRecord);

    const totalPaid = records
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalRefunded = records
      .filter((p) => p.status === 'refunded')
      .reduce((sum, p) => sum + p.amount, 0);

    const byMethod: Record<PaymentMethod, number> = {
      cash: 0,
      card: 0,
      upi: 0,
      netbanking: 0,
      cheque: 0,
      dd: 0,
      online: 0,
    };

    for (const p of records) {
      if (p.status === 'completed') {
        byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;
      }
    }

    return {
      payments: records,
      totalPaid,
      totalRefunded,
      netPaid: totalPaid - totalRefunded,
      totalTransactions: records.length,
      byMethod,
    };
  }

  async getNextReceiptNumber(): Promise<string> {
    const lastPayment = await Payment.findOne().sort({ createdAt: -1 }).select('receiptNumber');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    let nextSeq = 1;
    if (lastPayment?.receiptNumber) {
      const match = lastPayment.receiptNumber.match(/RCP-(\d{4})(\d{2})-(\d+)/);
      if (match && match[1] === String(year) && match[2] === month) {
        nextSeq = parseInt(match[3] ?? '0', 10) + 1;
      }
    }

    return `RCP-${year}${month}-${String(nextSeq).padStart(5, '0')}`;
  }
}