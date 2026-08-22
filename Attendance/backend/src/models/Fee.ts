import mongoose, { Document, Schema } from "mongoose";

export interface IFee extends Document {
  studentId: mongoose.Types.ObjectId;
  registerNumber: string;
  tuitionFee: number;
  hostelFee: number;
  totalFee: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  status: "paid" | "partial" | "pending";
  academicYear: string;
  createdAt: Date;
  updatedAt: Date;
}

const feeSchema = new Schema<IFee>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    registerNumber: { type: String, required: true, trim: true, index: true },
    tuitionFee: { type: Number, required: true, min: 0 },
    hostelFee: { type: Number, default: 0, min: 0 },
    totalFee: { type: Number, required: true },
    paidAmount: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ["paid", "partial", "pending"], default: "pending" },
    academicYear: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);
feeSchema.index({ registerNumber: 1, academicYear: 1 }, { unique: true });
export const Fee = mongoose.model<IFee>("Fee", feeSchema);
