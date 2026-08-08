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
  findByUsername(username: string): Promise<IUser | null>;
  findByStudentId(studentId: string): Promise<IUser | null>;
}

const userSchema = new Schema<IUser, IUserModel>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [50, 'Username cannot exceed 50 characters'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'parent'],
      required: [true, 'Role is required'],
    },
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      trim: true,
      index: true,
    },
    whatsappNumber: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [1, 'Year must be at least 1'],
      max: [6, 'Year cannot exceed 6'],
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
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



userSchema.statics.findByPhone = function (phone: string) {
  return this.findOne({ whatsappNumber: phone, isActive: true });
};

userSchema.statics.findByUsername = function (username: string) {
  return this.findOne({ username, isActive: true }).select('+passwordHash');
};

userSchema.statics.findByStudentId = function (studentId: string) {
  return this.findOne({ studentId, isActive: true });
};

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
