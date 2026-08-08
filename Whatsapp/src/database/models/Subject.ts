import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type SubjectType = 'theory' | 'lab' | 'elective';

export interface ISubject extends Document {
  code: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  type: SubjectType;
  faculty: string;
  prerequisites: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubjectModel extends Model<ISubject> {
  findByCode(code: string): Promise<ISubject | null>;
  findByDepartmentAndSemester(department: string, semester: number): Promise<ISubject[]>;
  findByFaculty(faculty: string): Promise<ISubject[]>;
}

const subjectSchema = new Schema<ISubject, ISubjectModel>(
  {
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Code cannot exceed 20 characters'],
    },
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [12, 'Semester cannot exceed 12'],
    },
    credits: {
      type: Number,
      required: [true, 'Credits is required'],
      min: [1, 'Credits must be at least 1'],
      max: [6, 'Credits cannot exceed 6'],
    },
    type: {
      type: String,
      enum: ['theory', 'lab', 'elective'],
      required: [true, 'Subject type is required'],
    },
    faculty: {
      type: String,
      required: [true, 'Faculty is required'],
      trim: true,
      default: 'TBA',
    },
    prerequisites: [
      {
        type: String,
        trim: true,
        uppercase: true,
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

subjectSchema.index({ department: 1, semester: 1 });
subjectSchema.index({ faculty: 1 });
subjectSchema.index({ prerequisites: 1 });

subjectSchema.statics.findByCode = function (code: string) {
  return this.findOne({ code: code.toUpperCase(), isActive: true }).exec();
};

subjectSchema.statics.findByDepartmentAndSemester = function (department: string, semester: number) {
  return this.find({ department, semester, isActive: true }).sort({ code: 1 }).exec();
};

subjectSchema.statics.findByFaculty = function (faculty: string) {
  return this.find({ faculty, isActive: true }).sort({ semester: 1, code: 1 }).exec();
};

export const Subject = mongoose.model<ISubject, ISubjectModel>('Subject', subjectSchema);
