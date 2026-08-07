import mongoose, { Schema, type Document, type ObjectId } from 'mongoose';

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'netbanking' | 'cheque' | 'dd' | 'online';

export interface IReceipt extends Document {
  receiptNumber: string;
  studentId: string;
  studentName: string;
  paymentId: ObjectId;
  installmentId: ObjectId;
  feeCode: string;
  feeName: string;
  amount: number;
  totalPaid: number;
  remainingAmount: number;
  method: PaymentMethod;
  transactionId: string | null;
  semester: number;
  academicYear: string;
  generatedAt: Date;
  collectedBy: string | null;
  notes: string | null;
}

const receiptSchema = new Schema<IReceipt>(
  {
    receiptNumber: { type: String, required: true, unique: true, trim: true, index: true },
    studentId: { type: String, required: true, trim: true, index: true },
    studentName: { type: String, required: true, trim: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    installmentId: { type: Schema.Types.ObjectId, ref: 'Installment', required: true },
    feeCode: { type: String, required: true, trim: true },
    feeName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    totalPaid: { type: Number, required: true, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'netbanking', 'cheque', 'dd', 'online'],
      required: true,
    },
    transactionId: { type: String, default: null },
    semester: { type: Number, required: true, min: 1, max: 12 },
    academicYear: { type: String, required: true, trim: true },
    generatedAt: { type: Date, required: true, default: Date.now, index: true },
    collectedBy: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: false },
);

receiptSchema.index({ studentId: 1, generatedAt: -1 });
receiptSchema.index({ receiptNumber: 1, studentId: 1 }, { unique: true });

export const Receipt = mongoose.model<IReceipt>('Receipt', receiptSchema);