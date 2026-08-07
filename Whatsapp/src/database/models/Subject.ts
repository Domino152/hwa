import mongoose, { Schema, type Document } from 'mongoose';

export interface ISubject extends Document {
  code: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  type: 'theory' | 'lab' | 'elective';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    credits: { type: Number, required: true, min: 1, max: 6 },
    type: { type: String, enum: ['theory', 'lab', 'elective'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

subjectSchema.index({ department: 1, semester: 1 });

export const Subject = mongoose.model<ISubject>('Subject', subjectSchema);
