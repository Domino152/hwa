import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IBatch extends Document {
  programId: mongoose.Types.ObjectId;
  year: number;
  name: string;
  totalStudents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBatchModel extends Model<IBatch> {
  findByProgramAndYear(programId: string, year: number): Promise<IBatch | null>;
  findByProgramId(programId: string): Promise<IBatch[]>;
}

const batchSchema = new Schema<IBatch, IBatchModel>(
  {
    programId: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program ID is required'],
    },
    year: {
      type: Number,
      required: [true, 'Admission year is required'],
      min: [2000, 'Year must be 2000 or later'],
      max: [2100, 'Year cannot exceed 2100'],
    },
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    totalStudents: {
      type: Number,
      default: 0,
      min: [0, 'Total students cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

batchSchema.index({ programId: 1, year: 1 }, { unique: true });

batchSchema.statics.findByProgramAndYear = function (programId: string, year: number) {
  return this.findOne({ programId, year, isActive: true }).exec();
};

batchSchema.statics.findByProgramId = function (programId: string) {
  return this.find({ programId, isActive: true }).sort({ year: -1 }).exec();
};

export const Batch = mongoose.model<IBatch, IBatchModel>('Batch', batchSchema);
