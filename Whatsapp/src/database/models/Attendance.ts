import mongoose, { Schema, type Document } from 'mongoose';

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

const attendanceSchema = new Schema<IAttendance>(
  {
    studentId: { type: String, required: true },
    subject: { type: String, required: true, trim: true },
    totalClasses: { type: Number, required: true, min: 0 },
    attendedClasses: { type: Number, required: true, min: 0 },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    semester: { type: Number, required: true, min: 1 },
    academicYear: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

attendanceSchema.index({ studentId: 1, semester: 1, academicYear: 1 });

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);
