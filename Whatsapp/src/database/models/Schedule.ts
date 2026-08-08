import mongoose, { Schema, type Document, type Types, type Model } from 'mongoose';

export interface IHoliday {
  date: Date;
  reason: string;
  academicYear: string;
}

export interface ISchedule extends Document {
  sectionId: Types.ObjectId;
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
  holidays: IHoliday[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IScheduleModel extends Model<ISchedule> {
  findBySectionAndDay(sectionId: string, dayOfWeek: string): Promise<ISchedule[]>;
  findBySectionAndWeek(sectionId: string, academicYear: string): Promise<ISchedule[]>;
  findByFaculty(faculty: string, academicYear: string): Promise<ISchedule[]>;
  addHoliday(scheduleId: string, holiday: IHoliday): Promise<ISchedule>;
  removeHoliday(scheduleId: string, date: Date): Promise<ISchedule>;
}

const scheduleSchema = new Schema<ISchedule, IScheduleModel>(
  {
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section ID is required'],
      index: true,
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
    dayOfWeek: {
      type: String,
      required: [true, 'Day of week is required'],
      trim: true,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    periodNumber: {
      type: Number,
      required: [true, 'Period number is required'],
      min: [1, 'Period must be at least 1'],
      max: [10, 'Period cannot exceed 10'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    faculty: {
      type: String,
      required: [true, 'Faculty is required'],
      trim: true,
      default: 'TBA',
    },
    room: {
      type: String,
      required: [true, 'Room is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['lecture', 'lab', 'tutorial'],
      required: [true, 'Type is required'],
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
    holidays: [
      {
        date: { type: Date, required: true },
        reason: { type: String, required: true, trim: true, maxlength: [200, 'Reason cannot exceed 200 characters'] },
        academicYear: { type: String, required: true, trim: true },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

scheduleSchema.index({ sectionId: 1, dayOfWeek: 1 });
scheduleSchema.index({ sectionId: 1, academicYear: 1 });
scheduleSchema.index({ faculty: 1 });
scheduleSchema.index({ semester: 1, academicYear: 1 });

scheduleSchema.statics.findBySectionAndDay = function (sectionId: string, dayOfWeek: string) {
  return this.find({ sectionId, dayOfWeek, isActive: true }).sort({ periodNumber: 1 }).exec();
};

scheduleSchema.statics.findBySectionAndWeek = function (sectionId: string, academicYear: string) {
  return this.find({ sectionId, academicYear, isActive: true }).sort({ dayOfWeek: 1, periodNumber: 1 }).exec();
};

scheduleSchema.statics.findByFaculty = function (faculty: string, academicYear: string) {
  return this.find({ faculty, academicYear, isActive: true }).sort({ dayOfWeek: 1, periodNumber: 1 }).exec();
};

scheduleSchema.statics.addHoliday = async function (scheduleId: string, holiday: IHoliday) {
  return this.findByIdAndUpdate(
    scheduleId,
    { $push: { holidays: holiday } },
    { new: true },
  ).exec();
};

scheduleSchema.statics.removeHoliday = async function (scheduleId: string, date: Date) {
  return this.findByIdAndUpdate(
    scheduleId,
    { $pull: { holidays: { date } } },
    { new: true },
  ).exec();
};

export const Schedule = mongoose.model<ISchedule, IScheduleModel>('Schedule', scheduleSchema);
