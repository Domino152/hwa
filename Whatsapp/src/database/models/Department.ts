import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  code: string;
  collegeId: mongoose.Types.ObjectId;
  hodName?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDepartmentModel extends Model<IDepartment> {
  findByCode(code: string): Promise<IDepartment | null>;
  findByCollegeId(collegeId: string): Promise<IDepartment[]>;
}

const departmentSchema = new Schema<IDepartment, IDepartmentModel>(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Code cannot exceed 20 characters'],
    },
    collegeId: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College ID is required'],
      index: true,
    },
    hodName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

departmentSchema.index({ collegeId: 1 });

departmentSchema.statics.findByCode = function (code: string) {
  return this.findOne({ code: code.toUpperCase(), isActive: true }).exec();
};

departmentSchema.statics.findByCollegeId = function (collegeId: string) {
  return this.find({ collegeId, isActive: true }).exec();
};

export const Department = mongoose.model<IDepartment, IDepartmentModel>('Department', departmentSchema);
