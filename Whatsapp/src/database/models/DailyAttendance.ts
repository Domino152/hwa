import mongoose, { Schema, type Document, type Types, type Model } from 'mongoose';

export type AttendanceStatus = 'present' | 'absent' | 'od' | 'medical_leave' | 'leave' | 'late' | 'cancelled';

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

export interface IDailyAttendanceModel extends Model<IDailyAttendance> {
  findByStudentAndDate(studentId: string, date: Date): Promise<IDailyAttendance[]>;
  findByStudentAndSubject(studentId: string, subject: string, semester: number, academicYear: string): Promise<IDailyAttendance[]>;
  getAttendanceSummary(studentId: string, semester: number, academicYear: string): Promise<{ total: number; present: number; percentage: number }>;
}

const dailyAttendanceSchema = new Schema<IDailyAttendance, IDailyAttendanceModel>(
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
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'od', 'medical_leave', 'leave', 'late', 'cancelled'],
      required: [true, 'Status is required'],
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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
    notes: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  { timestamps: true },
);

dailyAttendanceSchema.index({ studentId: 1, subject: 1, date: 1 }, { unique: true });
dailyAttendanceSchema.index({ studentId: 1, date: 1 });
dailyAttendanceSchema.index({ studentId: 1, subject: 1, semester: 1, academicYear: 1 });
dailyAttendanceSchema.index({ date: 1 });
dailyAttendanceSchema.index({ semester: 1, academicYear: 1 });

dailyAttendanceSchema.statics.findByStudentAndDate = function (studentId: string, date: Date) {
  return this.find({ studentId, date }).sort({ subject: 1 }).exec();
};

dailyAttendanceSchema.statics.findByStudentAndSubject = function (
  studentId: string,
  subject: string,
  semester: number,
  academicYear: string,
) {
  return this.find({ studentId, subject, semester, academicYear }).sort({ date: 1 }).exec();
};

dailyAttendanceSchema.statics.getAttendanceSummary = async function (
  studentId: string,
  semester: number,
  academicYear: string,
) {
  const result = await this.aggregate([
    { $match: { studentId, semester, academicYear, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: {
          $sum: {
            $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        total: 1,
        present: 1,
        percentage: {
          $cond: [
            { $eq: ['$total', 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 2] },
          ],
        },
      },
    },
  ]);

  return result[0] || { total: 0, present: 0, percentage: 0 };
};

export const DailyAttendance =
  mongoose.model<IDailyAttendance, IDailyAttendanceModel>('DailyAttendance', dailyAttendanceSchema);
