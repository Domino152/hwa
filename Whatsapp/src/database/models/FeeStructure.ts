import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type FeeCategory = 'tuition' | 'exam' | 'lab' | 'development' | 'misc';
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

export interface IFeeStructureModel extends Model<IFeeStructure> {
  findByCode(code: string, academicYear: string): Promise<IFeeStructure | null>;
  findByDepartmentAndYear(department: string, program: string, academicYear: string): Promise<IFeeStructure[]>;
  findByCategory(category: FeeCategory, academicYear: string): Promise<IFeeStructure[]>;
}

const feeStructureSchema = new Schema<IFeeStructure, IFeeStructureModel>(
  {
    code: {
      type: String,
      required: [true, 'Fee code is required'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'Code cannot exceed 50 characters'],
    },
    name: {
      type: String,
      required: [true, 'Fee name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    category: {
      type: String,
      enum: ['tuition', 'exam', 'lab', 'development', 'misc'],
      required: [true, 'Category is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    frequency: {
      type: String,
      enum: ['one_time', 'semester', 'yearly'],
      required: [true, 'Frequency is required'],
      default: 'semester',
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true,
    },
    program: {
      type: String,
      required: [true, 'Program is required'],
      trim: true,
    },
    semester: {
      type: Number,
      min: [1, 'Semester must be at least 1'],
      max: [12, 'Semester cannot exceed 12'],
      default: null,
    },
    year: {
      type: Number,
      min: [1, 'Year must be at least 1'],
      max: [6, 'Year cannot exceed 6'],
      default: null,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
  },
  { timestamps: true },
);

feeStructureSchema.index({ code: 1, academicYear: 1 }, { unique: true });
feeStructureSchema.index({ department: 1, program: 1, semester: 1, academicYear: 1 });

feeStructureSchema.statics.findByCode = function (code: string, academicYear: string) {
  return this.findOne({ code: code.toUpperCase(), academicYear, isActive: true }).exec();
};

feeStructureSchema.statics.findByDepartmentAndYear = function (
  department: string,
  program: string,
  academicYear: string,
) {
  return this.find({ department, program, academicYear, isActive: true }).sort({ code: 1 }).exec();
};

feeStructureSchema.statics.findByCategory = function (category: FeeCategory, academicYear: string) {
  return this.find({ category, academicYear, isActive: true }).sort({ department: 1, program: 1 }).exec();
};

export const FeeStructure =
  mongoose.model<IFeeStructure, IFeeStructureModel>('FeeStructure', feeStructureSchema);
