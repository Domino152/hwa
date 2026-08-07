import mongoose, { Schema, type Document } from 'mongoose';

export interface IResult extends Document {
  studentId: string;
  semester: number;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  grade: string;
  cgpa: number;
  examType: 'midterm' | 'final' | 'assignment';
  academicYear: string;
  createdAt: Date;
  updatedAt: Date;
}

const resultSchema = new Schema<IResult>(
  {
    studentId: { type: String, required: true },
    semester: { type: Number, required: true, min: 1 },
    subject: { type: String, required: true, trim: true },
    marksObtained: { type: Number, required: true, min: 0 },
    totalMarks: { type: Number, required: true, min: 1 },
    grade: { type: String, required: true, trim: true },
    cgpa: { type: Number, required: true, min: 0, max: 10 },
    examType: { type: String, enum: ['midterm', 'final', 'assignment'], required: true },
    academicYear: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

resultSchema.index({ studentId: 1, semester: 1, academicYear: 1 });

export const Result = mongoose.model<IResult>('Result', resultSchema);
