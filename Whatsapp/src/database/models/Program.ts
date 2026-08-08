import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IProgram extends Document {
  name: string;
  code: string;
  departmentId: mongoose.Types.ObjectId;
  degree: string;
  durationYears: number;
  totalSemesters: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProgramModel extends Model<IProgram> {
  findByCode(code: string): Promise<IProgram | null>;
  findByDepartmentId(departmentId: string): Promise<IProgram[]>;
}

const programSchema = new Schema<IProgram, IProgramModel>(
  {
    name: {
      type: String,
      required: [true, 'Program name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    code: {
      type: String,
      required: [true, 'Program code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [50, 'Code cannot exceed 50 characters'],
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department ID is required'],
      index: true,
    },
    degree: {
      type: String,
      required: [true, 'Degree type is required'],
      trim: true,
      enum: ['B.Tech', 'M.Tech', 'MBA', 'MCA', 'B.Sc', 'M.Sc', 'Ph.D'],
    },
    durationYears: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 year'],
      max: [6, 'Duration cannot exceed 6 years'],
      default: 4,
    },
    totalSemesters: {
      type: Number,
      required: [true, 'Total semesters is required'],
      min: [1, 'Total semesters must be at least 1'],
      max: [12, 'Total semesters cannot exceed 12'],
      default: 8,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

programSchema.index({ departmentId: 1 });

programSchema.statics.findByCode = function (code: string) {
  return this.findOne({ code: code.toUpperCase(), isActive: true }).exec();
};

programSchema.statics.findByDepartmentId = function (departmentId: string) {
  return this.find({ departmentId, isActive: true }).exec();
};

export const Program = mongoose.model<IProgram, IProgramModel>('Program', programSchema);
