import mongoose, { Schema, type Document } from 'mongoose';

export interface IHolidayOverride extends Document {
  department: string;
  year: number;
  section: string;
  date: Date;
  reason: string;
  academicYear: string;
  createdAt: Date;
  updatedAt: Date;
}

const holidayOverrideSchema = new Schema<IHolidayOverride>(
  {
    department: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1, max: 4 },
    section: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 200 },
    academicYear: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

holidayOverrideSchema.index({ department: 1, year: 1, section: 1, date: 1 });
holidayOverrideSchema.index({ department: 1, year: 1, section: 1, academicYear: 1 });

export const HolidayOverride = mongoose.model<IHolidayOverride>('HolidayOverride', holidayOverrideSchema);

export interface ISchedule extends Document {
  department: string;
  year: number;
  section: string;
  dayOfWeek: string;
  periodNumber: number;
  timeSlot: string;
  subject: string;
  faculty: string;
  room: string;
  type: 'lecture' | 'lab' | 'tutorial';
  semester: number;
  academicYear: string;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    department: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1, max: 4 },
    section: { type: String, required: true, trim: true },
    dayOfWeek: { type: String, required: true, trim: true },
    periodNumber: { type: Number, required: true, min: 1, max: 10 },
    timeSlot: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    faculty: { type: String, required: true, trim: true, default: 'TBA' },
    room: { type: String, required: true, trim: true },
    type: { type: String, enum: ['lecture', 'lab', 'tutorial'], required: true },
    semester: { type: Number, required: true, min: 1 },
    academicYear: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

scheduleSchema.index({ department: 1, year: 1, section: 1, dayOfWeek: 1 });
scheduleSchema.index({ department: 1, year: 1, section: 1, academicYear: 1 });
scheduleSchema.index({ faculty: 1 });

export const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
