import mongoose, { Schema, type Document } from 'mongoose';

export interface IFee extends Document {
  studentId: string;
  feeType: string;
  totalFee: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  status: 'paid' | 'partial' | 'pending';
  semester: number;
  academicYear: string;
  createdAt: Date;
  updatedAt: Date;
}

const feeSchema = new Schema<IFee>(
  {
    studentId: { type: String, required: true, index: true },
    feeType: { type: String, required: true, trim: true },
    totalFee: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['paid', 'partial', 'pending'], required: true, default: 'pending' },
    semester: { type: Number, required: true, min: 1 },
    academicYear: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

feeSchema.index({ studentId: 1, semester: 1, academicYear: 1 });

export const Fee = mongoose.model<IFee>('Fee', feeSchema);
