import mongoose, { Schema, type Document, type ObjectId } from 'mongoose';

export type InstallmentStatus = 'upcoming' | 'due' | 'overdue' | 'paid' | 'partial';

export interface IInstallment extends Document {
  installmentNumber: number;
  studentId: string;
  feeStructureId: ObjectId;
  feeCode: string;
  feeName: string;
  category: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  paidDate: Date | null;
  status: InstallmentStatus;
  semester: number;
  academicYear: string;
  lateFine: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const installmentSchema = new Schema<IInstallment>(
  {
    installmentNumber: { type: Number, required: true, min: 1 },
    studentId: { type: String, required: true, trim: true, index: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure', required: true, index: true },
    feeCode: { type: String, required: true, trim: true },
    feeName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true, index: true },
    paidDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['upcoming', 'due', 'overdue', 'paid', 'partial'],
      required: true,
      default: 'upcoming',
      index: true,
    },
    semester: { type: Number, required: true, min: 1, max: 12 },
    academicYear: { type: String, required: true, trim: true },
    lateFine: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: null },
  },
  { timestamps: true },
);

installmentSchema.index({ studentId: 1, semester: 1, academicYear: 1 });
installmentSchema.index({ studentId: 1, feeStructureId: 1, installmentNumber: 1 }, { unique: true });
installmentSchema.index({ status: 1, dueDate: 1 });

export const Installment = mongoose.model<IInstallment>('Installment', installmentSchema);