import mongoose, { Schema, type Document } from 'mongoose';

export interface IDetailedResult extends Document {
  studentId: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  academicYear: string;
  internalMarks: number | null;
  internalMax: number;
  externalMarks: number | null;
  externalMax: number;
  assignmentMarks: number | null;
  assignmentMax: number;
  labMarks: number | null;
  labMax: number;
  totalMarks: number;
  totalMax: number;
  percentage: number;
  credits: number;
  grade: string;
  gradePoints: number;
  isPublished: boolean;
  isAbsent: boolean;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const detailedResultSchema = new Schema<IDetailedResult>(
  {
    studentId: { type: String, required: true, trim: true, index: true },
    subjectCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    subjectName: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 12, index: true },
    academicYear: { type: String, required: true, trim: true, index: true },
    internalMarks: { type: Number, min: 0, default: null },
    internalMax: { type: Number, min: 0, default: 0 },
    externalMarks: { type: Number, min: 0, default: null },
    externalMax: { type: Number, min: 0, default: 0 },
    assignmentMarks: { type: Number, min: 0, default: null },
    assignmentMax: { type: Number, min: 0, default: 0 },
    labMarks: { type: Number, min: 0, default: null },
    labMax: { type: Number, min: 0, default: 0 },
    totalMarks: { type: Number, required: true, min: 0, default: 0 },
    totalMax: { type: Number, required: true, min: 0, default: 0 },
    percentage: { type: Number, required: true, min: 0, max: 100, default: 0 },
    credits: { type: Number, required: true, min: 0, default: 0 },
    grade: { type: String, required: true, trim: true, default: 'F' },
    gradePoints: { type: Number, required: true, min: 0, max: 10, default: 0 },
    isPublished: { type: Boolean, required: true, default: false, index: true },
    isAbsent: { type: Boolean, required: true, default: false },
    remarks: { type: String, default: null },
  },
  { timestamps: true },
);

detailedResultSchema.index({ studentId: 1, semester: 1, academicYear: 1 });
detailedResultSchema.index({ studentId: 1, subjectCode: 1, semester: 1, academicYear: 1 }, { unique: true });
detailedResultSchema.index({ subjectCode: 1, semester: 1, academicYear: 1 });

export const DetailedResult = mongoose.model<IDetailedResult>('DetailedResult', detailedResultSchema);