import mongoose, { Schema, type Document } from 'mongoose';

export type AssignmentStatus = 'draft' | 'published' | 'closed';

export interface IAssignment extends Document {
  title: string;
  description: string;
  subject: string;
  department: string;
  semester: number;
  academicYear: string;
  createdBy: string;
  facultyName: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  dueDate: Date;
  maxMarks: number;
  passingMarks: number;
  status: AssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    subject: { type: String, required: true, trim: true, index: true },
    department: { type: String, required: true, trim: true, index: true },
    semester: { type: Number, required: true, min: 1, max: 12, index: true },
    academicYear: { type: String, required: true, trim: true, index: true },
    createdBy: { type: String, required: true, trim: true },
    facultyName: { type: String, required: true, trim: true },
    attachmentUrl: { type: String, default: null },
    attachmentName: { type: String, default: null },
    dueDate: { type: Date, required: true, index: true },
    maxMarks: { type: Number, required: true, min: 0 },
    passingMarks: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      required: true,
      default: 'draft',
      index: true,
    },
  },
  { timestamps: true },
);

assignmentSchema.index({ subject: 1, department: 1, semester: 1, academicYear: 1 });
assignmentSchema.index({ createdBy: 1, status: 1 });
assignmentSchema.index({ status: 1, dueDate: 1 });

export const Assignment = mongoose.model<IAssignment>('Assignment', assignmentSchema);