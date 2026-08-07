import mongoose, { Schema, type Document, type ObjectId } from 'mongoose';

export type FineReason = 'late_payment' | 'absenteeism' | 'damage' | 'library_overdue' | 'discipline' | 'other';

export interface IFine extends Document {
  studentId: string;
  reason: FineReason;
  description: string;
  amount: number;
  waivedAmount: number;
  netAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  paidDate: Date | null;
  status: 'pending' | 'paid' | 'partial' | 'waived';
  installmentId: ObjectId | null;
  semester: number;
  academicYear: string;
  imposedBy: string | null;
  waivedBy: string | null;
  waiverReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const fineSchema = new Schema<IFine>(
  {
    studentId: { type: String, required: true, trim: true, index: true },
    reason: {
      type: String,
      enum: ['late_payment', 'absenteeism', 'damage', 'library_overdue', 'discipline', 'other'],
      required: true,
      index: true,
    },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    waivedAmount: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true, index: true },
    paidDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'waived'],
      required: true,
      default: 'pending',
      index: true,
    },
    installmentId: { type: Schema.Types.ObjectId, ref: 'Installment', default: null },
    semester: { type: Number, required: true, min: 1, max: 12 },
    academicYear: { type: String, required: true, trim: true, index: true },
    imposedBy: { type: String, default: null },
    waivedBy: { type: String, default: null },
    waiverReason: { type: String, default: null },
  },
  { timestamps: true },
);

fineSchema.index({ studentId: 1, semester: 1, academicYear: 1 });
fineSchema.index({ studentId: 1, status: 1 });

export const Fine = mongoose.model<IFine>('Fine', fineSchema);