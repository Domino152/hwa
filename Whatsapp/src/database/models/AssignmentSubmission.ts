import mongoose, { Schema, type Document, type ObjectId } from 'mongoose';

export type SubmissionStatus = 'submitted' | 'graded' | 'returned' | 'resubmitted';

export interface IAssignmentSubmission extends Document {
  assignmentId: ObjectId;
  studentId: string;
  studentName: string;
  submissionDate: Date;
  isLate: boolean;
  latePenalty: number;
  fileUrl: string | null;
  fileName: string | null;
  status: SubmissionStatus;
  marks: number | null;
  grade: string | null;
  feedback: string | null;
  gradedBy: string | null;
  gradedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    studentId: { type: String, required: true, trim: true, index: true },
    studentName: { type: String, required: true, trim: true },
    submissionDate: { type: Date, required: true, default: Date.now, index: true },
    isLate: { type: Boolean, required: true, default: false },
    latePenalty: { type: Number, default: 0, min: 0 },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    status: {
      type: String,
      enum: ['submitted', 'graded', 'returned', 'resubmitted'],
      required: true,
      default: 'submitted',
      index: true,
    },
    marks: { type: Number, default: null, min: 0 },
    grade: { type: String, default: null },
    feedback: { type: String, default: null, maxlength: 2000 },
    gradedBy: { type: String, default: null },
    gradedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
assignmentSubmissionSchema.index({ studentId: 1, createdAt: -1 });
assignmentSubmissionSchema.index({ status: 1, gradedAt: 1 });

export const AssignmentSubmission = mongoose.model<IAssignmentSubmission>('AssignmentSubmission', assignmentSubmissionSchema);