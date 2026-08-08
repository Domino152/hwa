import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IComponentMarks {
  marks: number;
  max: number;
}

export interface IResult extends Document {
  studentId: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  academicYear: string;
  examType: 'midterm' | 'assignment' | 'final';
  internalMarks: IComponentMarks | null;
  externalMarks: IComponentMarks | null;
  assignmentMarks: IComponentMarks | null;
  labMarks: IComponentMarks | null;
  totalMarks: number;
  totalMax: number;
  percentage: number;
  credits: number;
  grade: string;
  gradePoints: number;
  gpa: number | null;
  cgpa: number | null;
  isPublished: boolean;
  isAbsent: boolean;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResultModel extends Model<IResult> {
  findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<IResult[]>;
  findByStudentAndSubject(studentId: string, subjectCode: string, semester: number, academicYear: string): Promise<IResult | null>;
  calculateGPA(studentId: string, semester: number, academicYear: string): Promise<number>;
  calculateCGPA(studentId: string): Promise<number>;
}

const componentMarksSchema = new Schema<IComponentMarks>(
  {
    marks: { type: Number, min: 0, default: 0 },
    max: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const resultSchema = new Schema<IResult, IResultModel>(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
    },
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
      uppercase: true,
    },
    subjectName: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
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
    examType: {
      type: String,
      enum: ['midterm', 'assignment', 'final'],
      required: [true, 'Exam type is required'],
    },
    internalMarks: {
      type: componentMarksSchema,
      default: null,
    },
    externalMarks: {
      type: componentMarksSchema,
      default: null,
    },
    assignmentMarks: {
      type: componentMarksSchema,
      default: null,
    },
    labMarks: {
      type: componentMarksSchema,
      default: null,
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks is required'],
      min: [0, 'Total marks cannot be negative'],
      default: 0,
    },
    totalMax: {
      type: Number,
      required: [true, 'Total max marks is required'],
      min: [0, 'Total max marks cannot be negative'],
      default: 0,
    },
    percentage: {
      type: Number,
      required: [true, 'Percentage is required'],
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100'],
      default: 0,
    },
    credits: {
      type: Number,
      required: [true, 'Credits is required'],
      min: [0, 'Credits cannot be negative'],
      default: 0,
    },
    grade: {
      type: String,
      required: [true, 'Grade is required'],
      trim: true,
      default: 'F',
    },
    gradePoints: {
      type: Number,
      required: [true, 'Grade points is required'],
      min: [0, 'Grade points cannot be negative'],
      max: [10, 'Grade points cannot exceed 10'],
      default: 0,
    },
    gpa: {
      type: Number,
      min: [0, 'GPA cannot be negative'],
      max: [10, 'GPA cannot exceed 10'],
      default: null,
    },
    cgpa: {
      type: Number,
      min: [0, 'CGPA cannot be negative'],
      max: [10, 'CGPA cannot exceed 10'],
      default: null,
    },
    isPublished: {
      type: Boolean,
      required: [true, 'Published status is required'],
      default: false,
      index: true,
    },
    isAbsent: {
      type: Boolean,
      required: [true, 'Absent flag is required'],
      default: false,
    },
    remarks: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
  },
  { timestamps: true },
);

resultSchema.index({ studentId: 1, semester: 1, academicYear: 1 });
resultSchema.index({ studentId: 1, subjectCode: 1, semester: 1, academicYear: 1 }, { unique: true });
resultSchema.index({ subjectCode: 1, semester: 1, academicYear: 1 });

resultSchema.statics.findByStudentAndSemester = function (studentId: string, semester: number, academicYear: string) {
  return this.find({ studentId, semester, academicYear, isPublished: true }).sort({ subjectCode: 1 }).exec();
};

resultSchema.statics.findByStudentAndSubject = function (
  studentId: string,
  subjectCode: string,
  semester: number,
  academicYear: string,
) {
  return this.findOne({ studentId, subjectCode, semester, academicYear }).exec();
};

resultSchema.statics.calculateGPA = async function (studentId: string, semester: number, academicYear: string) {
  const results = await this.find({
    studentId,
    semester,
    academicYear,
    isPublished: true,
  }).exec();

  if (results.length === 0) return 0;

  let totalGradePoints = 0;
  let totalCredits = 0;

  for (const result of results) {
    totalGradePoints += result.gradePoints * result.credits;
    totalCredits += result.credits;
  }

  return totalCredits > 0 ? Math.round((totalGradePoints / totalCredits) * 100) / 100 : 0;
};

resultSchema.statics.calculateCGPA = async function (studentId: string) {
  const results = await this.find({
    studentId,
    isPublished: true,
  }).exec();

  if (results.length === 0) return 0;

  let totalGradePoints = 0;
  let totalCredits = 0;

  for (const result of results) {
    totalGradePoints += result.gradePoints * result.credits;
    totalCredits += result.credits;
  }

  return totalCredits > 0 ? Math.round((totalGradePoints / totalCredits) * 100) / 100 : 0;
};

export const Result = mongoose.model<IResult, IResultModel>('Result', resultSchema);
