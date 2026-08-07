import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type UserRole = 'student' | 'parent';

export interface IUser extends Document {
  fullName: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  studentId: string;
  whatsappNumber: string | null;
  department: string;
  year: number;
  section: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserModel extends Model<IUser> {
  findByPhone(phone: string): Promise<IUser | null>;
}

const userSchema = new Schema<IUser, IUserModel>(
  {
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'parent'], required: true },
    studentId: { type: String, required: true, trim: true, index: true },
    whatsappNumber: { type: String, default: null, unique: true, sparse: true },
    department: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1 },
    section: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.statics.findByPhone = function (phone: string) {
  return this.findOne({ whatsappNumber: phone, isActive: true });
};

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
