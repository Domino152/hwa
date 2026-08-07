import mongoose, { Schema, type Document, type ObjectId } from 'mongoose';

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'netbanking' | 'cheque' | 'dd' | 'online';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface IPayment extends Document {
  receiptNumber: string;
  studentId: string;
  installmentId: ObjectId;
  feeStructureId: ObjectId;
  amount: number;
  method: PaymentMethod;
  transactionId: string | null;
  status: PaymentStatus;
  semester: number;
  academicYear: string;
  paidAt: Date;
  collectedBy: string | null;
  remarks: string | null;
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    receiptNumber: { type: String, required: true, unique: true, trim: true, index: true },
    studentId: { type: String, required: true, trim: true, index: true },
    installmentId: { type: Schema.Types.ObjectId, ref: 'Installment', required: true, index: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'netbanking', 'cheque', 'dd', 'online'],
      required: true,
    },
    transactionId: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      required: true,
      default: 'completed',
      index: true,
    },
    semester: { type: Number, required: true, min: 1, max: 12 },
    academicYear: { type: String, required: true, trim: true },
    paidAt: { type: Date, required: true, default: Date.now, index: true },
    collectedBy: { type: String, default: null },
    remarks: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

paymentSchema.index({ studentId: 1, paidAt: -1 });
paymentSchema.index({ studentId: 1, semester: 1, academicYear: 1 });
paymentSchema.index({ installmentId: 1, status: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);