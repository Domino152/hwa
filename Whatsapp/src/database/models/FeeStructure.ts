import mongoose, { Schema, type Document } from 'mongoose';

export type FeeCategory = 'tuition' | 'hostel' | 'exam' | 'lab' | 'transport' | 'library' | 'sports' | 'development' | 'misc';
export type FeeFrequency = 'one_time' | 'semester' | 'yearly';

export interface IFeeStructure extends Document {
  code: string;
  name: string;
  category: FeeCategory;
  amount: number;
  frequency: FeeFrequency;
  department: string;
  program: string;
  semester: number | null;
  year: number | null;
  academicYear: string;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const feeStructureSchema = new Schema<IFeeStructure>(
  {
    code: { type: String, required: true, trim: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['tuition', 'hostel', 'exam', 'lab', 'transport', 'library', 'sports', 'development', 'misc'],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    frequency: {
      type: String,
      enum: ['one_time', 'semester', 'yearly'],
      required: true,
      default: 'semester',
    },
    department: { type: String, required: true, trim: true, index: true },
    program: { type: String, required: true, trim: true },
    semester: { type: Number, min: 1, max: 12, default: null },
    year: { type: Number, min: 1, max: 6, default: null },
    academicYear: { type: String, required: true, trim: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    description: { type: String, default: null },
  },
  { timestamps: true },
);

feeStructureSchema.index({ department: 1, program: 1, semester: 1, academicYear: 1 });
feeStructureSchema.index({ code: 1, academicYear: 1 }, { unique: true });

export const FeeStructure = mongoose.model<IFeeStructure>('FeeStructure', feeStructureSchema);