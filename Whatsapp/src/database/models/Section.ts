import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ISection extends Document {
  batchId: mongoose.Types.ObjectId;
  name: string;
  advisorName?: string;
  capacity: number;
  currentStrength: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISectionModel extends Model<ISection> {
  findByBatchAndName(batchId: string, name: string): Promise<ISection | null>;
  findByBatchId(batchId: string): Promise<ISection[]>;
  incrementStrength(sectionId: string): Promise<void>;
  decrementStrength(sectionId: string): Promise<void>;
}

const sectionSchema = new Schema<ISection, ISectionModel>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
      maxlength: [10, 'Name cannot exceed 10 characters'],
    },
    advisorName: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number,
      default: 60,
      min: [1, 'Capacity must be at least 1'],
      max: [200, 'Capacity cannot exceed 200'],
    },
    currentStrength: {
      type: Number,
      default: 0,
      min: [0, 'Current strength cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

sectionSchema.index({ batchId: 1, name: 1 }, { unique: true });

sectionSchema.statics.findByBatchAndName = function (batchId: string, name: string) {
  return this.findOne({ batchId, name: name.toUpperCase(), isActive: true }).exec();
};

sectionSchema.statics.findByBatchId = function (batchId: string) {
  return this.find({ batchId, isActive: true }).sort({ name: 1 }).exec();
};

sectionSchema.statics.incrementStrength = async function (sectionId: string) {
  await this.findByIdAndUpdate(sectionId, { $inc: { currentStrength: 1 } }).exec();
};

sectionSchema.statics.decrementStrength = async function (sectionId: string) {
  await this.findByIdAndUpdate(sectionId, { $inc: { currentStrength: -1 } }).exec();
};

export const Section = mongoose.model<ISection, ISectionModel>('Section', sectionSchema);
