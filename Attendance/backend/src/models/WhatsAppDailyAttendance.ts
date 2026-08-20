import mongoose, { Schema, type Document } from 'mongoose';

export interface IWhatsAppDailyAttendance extends Document {
  studentId: string;
  subject: string;
  date: Date;
  status: 'present' | 'absent';
  semester: number;
  academicYear: string;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppDailyAttendanceSchema = new Schema<IWhatsAppDailyAttendance>(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      required: [true, 'Status is required'],
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

whatsAppDailyAttendanceSchema.index({ studentId: 1, subject: 1, date: 1 }, { unique: true });
whatsAppDailyAttendanceSchema.index({ studentId: 1, date: 1 });

export const WhatsAppDailyAttendance = mongoose.model<IWhatsAppDailyAttendance>(
  'WhatsAppDailyAttendance',
  whatsAppDailyAttendanceSchema,
  'dailyattendances',
);
