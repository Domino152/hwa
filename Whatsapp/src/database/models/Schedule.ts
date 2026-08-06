import mongoose, { Schema, type Document } from 'mongoose';

export interface ISchedule extends Document {
  department: string;
  year: number;
  section: string;
  dayOfWeek: string;
  timeSlot: string;
  subject: string;
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
    year: { type: Number, required: true, min: 1 },
    section: { type: String, required: true, trim: true },
    dayOfWeek: { type: String, required: true, trim: true },
    timeSlot: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    room: { type: String, required: true, trim: true },
    type: { type: String, enum: ['lecture', 'lab', 'tutorial'], required: true },
    semester: { type: Number, required: true, min: 1 },
    academicYear: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

scheduleSchema.index({ department: 1, year: 1, section: 1, dayOfWeek: 1 });

export const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
