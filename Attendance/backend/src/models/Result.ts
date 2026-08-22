import mongoose, { Document, Schema } from "mongoose";

export interface IResult extends Document {
  studentId: mongoose.Types.ObjectId;
  registerNumber: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  grade: string;
  semester: number;
  academicYear: string;
  examType: "internal" | "external" | "assignment";
  createdAt: Date;
  updatedAt: Date;
}

const resultSchema = new Schema<IResult>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    registerNumber: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    marksObtained: { type: Number, required: true, min: 0 },
    totalMarks: { type: Number, required: true, min: 1 },
    grade: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    academicYear: { type: String, required: true, trim: true },
    examType: { type: String, enum: ["internal", "external", "assignment"], default: "internal" },
  },
  { timestamps: true }
);
resultSchema.index({ registerNumber: 1, semester: 1, academicYear: 1, subject: 1, examType: 1 }, { unique: true });
export const Result = mongoose.model<IResult>("Result", resultSchema);
