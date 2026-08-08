import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type AssignmentStatus = 'draft' | 'published' | 'closed';
export type SubmissionStatus = 'submitted' | 'graded' | 'returned' | 'resubmitted';

export interface ISubmission {
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
}

export interface IAssignment extends Document {
  title: string;
  description: string;
  subjectId: Types.ObjectId;
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
  submissions: ISubmission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAssignmentModel extends Model<IAssignment> {
  findBySubject(subjectId: string, academicYear: string): Promise<IAssignment[]>;
  findByStatus(status: AssignmentStatus, department: string): Promise<IAssignment[]>;
  addSubmission(assignmentId: string, submission: ISubmission): Promise<IAssignment>;
  updateSubmission(assignmentId: string, studentId: string, updates: Partial<ISubmission>): Promise<IAssignment>;
  getSubmissionCount(assignmentId: string): Promise<number>;
  getGradedCount(assignmentId: string): Promise<number>;
}

const submissionSchema = new Schema<ISubmission>(
  {
    studentId: { type: String, required: true },
    studentName: { type: String, required: true, trim: true },
    submissionDate: { type: Date, required: true },
    isLate: { type: Boolean, default: false },
    latePenalty: { type: Number, default: 0, min: 0, max: 100 },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    status: {
      type: String,
      enum: ['submitted', 'graded', 'returned', 'resubmitted'],
      default: 'submitted',
    },
    marks: { type: Number, default: null, min: 0 },
    grade: { type: String, default: null, trim: true },
    feedback: { type: String, default: null, trim: true },
    gradedBy: { type: String, default: null, trim: true },
    gradedAt: { type: Date, default: null },
  },
  { _id: false },
);

const assignmentSchema = new Schema<IAssignment, IAssignmentModel>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject ID is required'],
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [12, 'Semester cannot exceed 12'],
      index: true,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: [true, 'Created by is required'],
      trim: true,
    },
    facultyName: {
      type: String,
      required: [true, 'Faculty name is required'],
      trim: true,
    },
    attachmentUrl: {
      type: String,
      default: null,
    },
    attachmentName: {
      type: String,
      default: null,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    maxMarks: {
      type: Number,
      required: [true, 'Max marks is required'],
      min: [0, 'Max marks cannot be negative'],
    },
    passingMarks: {
      type: Number,
      required: [true, 'Passing marks is required'],
      min: [0, 'Passing marks cannot be negative'],
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      required: [true, 'Status is required'],
      default: 'draft',
      index: true,
    },
    submissions: [submissionSchema],
  },
  { timestamps: true },
);

assignmentSchema.index({ subjectId: 1, status: 1, dueDate: -1 });
assignmentSchema.index({ createdBy: 1, status: 1 });
assignmentSchema.index({ department: 1, semester: 1, academicYear: 1 });

assignmentSchema.statics.findBySubject = function (subjectId: string, academicYear: string) {
  return this.find({ subjectId, academicYear, status: { $ne: 'draft' } }).sort({ dueDate: -1 }).exec();
};

assignmentSchema.statics.findByStatus = function (status: AssignmentStatus, department: string) {
  return this.find({ status, department }).sort({ dueDate: -1 }).exec();
};

assignmentSchema.statics.addSubmission = async function (assignmentId: string, submission: ISubmission) {
  return this.findByIdAndUpdate(
    assignmentId,
    { $push: { submissions: submission } },
    { new: true },
  ).exec();
};

assignmentSchema.statics.updateSubmission = async function (
  assignmentId: string,
  studentId: string,
  updates: Partial<ISubmission>,
) {
  return this.findOneAndUpdate(
    { _id: assignmentId, 'submissions.studentId': studentId },
    {
      $set: Object.keys(updates).reduce((acc, key) => {
        acc[`submissions.$.${key}`] = updates[key as keyof ISubmission];
        return acc;
      }, {} as Record<string, unknown>),
    },
    { new: true },
  ).exec();
};

assignmentSchema.statics.getSubmissionCount = async function (assignmentId: string) {
  const result = await this.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(assignmentId) } },
    { $project: { submissionCount: { $size: '$submissions' } } },
  ]);
  return result[0]?.submissionCount || 0;
};

assignmentSchema.statics.getGradedCount = async function (assignmentId: string) {
  const result = await this.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(assignmentId) } },
    { $unwind: '$submissions' },
    { $match: { 'submissions.status': 'graded' } },
    { $group: { _id: null, count: { $sum: 1 } } },
  ]);
  return result[0]?.count || 0;
};

export const Assignment = mongoose.model<IAssignment, IAssignmentModel>('Assignment', assignmentSchema);
