import mongoose, { Schema, type Document } from 'mongoose';

export type ScholarshipType = 'merit' | 'need_based' | 'sports' | 'government' | 'institutional' | 'other';
export type ScholarshipStatus = 'active' | 'expired' | 'revoked';

export interface IScholarship extends Document {
  studentId: string;
  scholarshipName: string;
  type: ScholarshipType;
  amount: number;
  percentage: number | null;
  provider: string;
  validFrom: Date;
  validUntil: Date;
  semester: number | null;
  academicYear: string;
  status: ScholarshipStatus;
  appliedAmount: number;
  reason: string | null;
  approvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const scholarshipSchema = new Schema<IScholarship>(
  {
    studentId: { type: String, required: true, trim: true, index: true },
    scholarshipName: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['merit', 'need_based', 'sports', 'government', 'institutional', 'other'],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    percentage: { type: Number, min: 0, max: 100, default: null },
    provider: { type: String, required: true, trim: true },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    semester: { type: Number, min: 1, max: 12, default: null },
    academicYear: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked'],
      required: true,
      default: 'active',
      index: true,
    },
    appliedAmount: { type: Number, default: 0, min: 0 },
    reason: { type: String, default: null },
    approvedBy: { type: String, default: null },
  },
  { timestamps: true },
);

scholarshipSchema.index({ studentId: 1, academicYear: 1 });
scholarshipSchema.index({ studentId: 1, status: 1 });
scholarshipSchema.index({ validFrom: 1, validUntil: 1 });

export const Scholarship = mongoose.model<IScholarship>('Scholarship', scholarshipSchema);