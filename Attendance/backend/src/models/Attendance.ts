import mongoose, { Document, Schema } from "mongoose";

export interface IAttendance extends Document {
  studentId: mongoose.Types.ObjectId;
  registerNumber: string;
  studentName: string;
  department: string;
  year: number;
  section: string;
  date: Date;
  subject: string;
  status: "present" | "absent";
  lateMinutes: number;
  lateSeconds: number;
  facultyName: string;
  createdAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID is required"],
    },
    registerNumber: {
      type: String,
      required: [true, "Register number is required"],
    },
    studentName: {
      type: String,
      required: [true, "Student name is required"],
    },
    department: {
      type: String,
      required: [true, "Department is required"],
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
    },
    section: {
      type: String,
      required: [true, "Section is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["present", "absent"],
        message: "Status must be present or absent",
      },
    },
    lateMinutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 59,
    },
    lateSeconds: {
      type: Number,
      default: 0,
      min: 0,
      max: 59,
    },
    facultyName: {
      type: String,
      required: [true, "Faculty name is required"],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

attendanceSchema.index(
  { studentId: 1, date: 1, subject: 1 },
  { unique: true }
);

attendanceSchema.index({ date: 1, department: 1, section: 1 });
attendanceSchema.index({ studentId: 1 });

export const Attendance = mongoose.model<IAttendance>(
  "Attendance",
  attendanceSchema
);
