import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface IDailyAttendance extends Document {
  studentId: string;
  subject: string;
  date: Date;
  status: AttendanceStatus;
  markedBy: Types.ObjectId | null;
  semester: number;
  academicYear: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const dailyAttendanceSchema = new Schema<IDailyAttendance>(
  {
    studentId: { type: String, required: true, index: true },
    subject: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      required: true,
    },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    semester: { type: Number, required: true, min: 1 },
    academicYear: { type: String, required: true, trim: true },
    notes: { type: String, default: null, trim: true },
  },
  { timestamps: true },
);

dailyAttendanceSchema.index({ studentId: 1, subject: 1, date: 1 }, { unique: true });
dailyAttendanceSchema.index({ studentId: 1, date: 1 });
dailyAttendanceSchema.index({ studentId: 1, subject: 1, semester: 1, academicYear: 1 });
dailyAttendanceSchema.index({ date: 1 });
dailyAttendanceSchema.index({ semester: 1, academicYear: 1 });

export const DailyAttendance = mongoose.model<IDailyAttendance>(
  'DailyAttendance',
  dailyAttendanceSchema,
);
