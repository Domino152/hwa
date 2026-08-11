import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IAttendance extends Document {
  studentId: string;
  subject: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  semester: number;
  academicYear: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttendanceModel extends Model<IAttendance> {}

const attendanceSchema = new Schema<IAttendance, IAttendanceModel>(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    totalClasses: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    attendedClasses: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [12, 'Semester cannot exceed 12'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
    },
  },
  { timestamps: true },
);

attendanceSchema.index({ studentId: 1, subject: 1, semester: 1, academicYear: 1 }, { unique: true });
attendanceSchema.index({ semester: 1, academicYear: 1 });

export const Attendance = mongoose.model<IAttendance, IAttendanceModel>('Attendance', attendanceSchema);
