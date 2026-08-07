import mongoose, { Schema, type Document, type Model, type ObjectId } from 'mongoose';

export type StudentStatus = 'active' | 'graduated' | 'suspended';
export type Gender = 'male' | 'female' | 'other';

export interface IStudent extends Document {
  userId: ObjectId;
  studentId: string;
  registerNumber: string;
  rollNumber: string;
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: Date;
  department: string;
  program: string;
  semester: number;
  section: string;
  batch: string;
  advisor: string;
  parentId: ObjectId | null;
  whatsappNumber: string | null;
  parentWhatsappNumber: string | null;
  status: StudentStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStudentModel extends Model<IStudent> {
  findByStudentId(studentId: string): Promise<IStudent | null>;
  findByRegisterNumber(registerNumber: string): Promise<IStudent | null>;
  findByUserId(userId: string): Promise<IStudent | null>;
}

const studentSchema = new Schema<IStudent, IStudentModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentId: { type: String, required: true, unique: true, trim: true },
    registerNumber: { type: String, required: true, unique: true, trim: true },
    rollNumber: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    dateOfBirth: { type: Date, required: true },
    department: { type: String, required: true, trim: true, index: true },
    program: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 12, index: true },
    section: { type: String, required: true, trim: true },
    batch: { type: String, required: true, trim: true },
    advisor: { type: String, required: true, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    whatsappNumber: { type: String, default: null, unique: true, sparse: true },
    parentWhatsappNumber: { type: String, default: null },
    status: { type: String, enum: ['active', 'graduated', 'suspended'], default: 'active', index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

studentSchema.statics.findByStudentId = function (studentId: string) {
  return this.findOne({ studentId, isActive: true });
};

studentSchema.statics.findByRegisterNumber = function (registerNumber: string) {
  return this.findOne({ registerNumber, isActive: true });
};

studentSchema.statics.findByUserId = function (userId: string) {
  return this.findOne({ userId, isActive: true });
};

export const Student = mongoose.model<IStudent, IStudentModel>('Student', studentSchema);
