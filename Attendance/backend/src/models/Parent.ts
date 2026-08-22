import mongoose, { Document, Schema } from "mongoose";

export interface IParent extends Document {
  studentId: mongoose.Types.ObjectId;
  registerNumber: string;
  fatherName: string;
  motherName: string;
  fatherPhone: string;
  motherPhone: string;
  guardianPhone: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

const parentSchema = new Schema<IParent>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    registerNumber: { type: String, required: true, trim: true, index: true },
    fatherName: { type: String, required: true, trim: true },
    motherName: { type: String, required: true, trim: true },
    fatherPhone: { type: String, required: true, trim: true },
    motherPhone: { type: String, required: true, trim: true },
    guardianPhone: { type: String, default: "", trim: true },
    address: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);
parentSchema.index({ registerNumber: 1 }, { unique: true });
export const Parent = mongoose.model<IParent>("Parent", parentSchema);
