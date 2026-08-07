/**
 * Raw record types returned by repository implementations.
 * These are plain data objects — no Mongoose Document wrappers.
 */

export interface AttendanceRecord {
  studentId: string;
  subject: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  semester: number;
  academicYear: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface DailyAttendanceRecord {
  studentId: string;
  subject: string;
  date: Date;
  status: AttendanceStatus;
  markedBy: string | null;
  semester: number;
  academicYear: string;
  notes: string | null;
}

export interface FeeRecord {
  studentId: string;
  feeType: string;
  totalFee: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  status: 'paid' | 'partial' | 'pending';
  semester: number;
  academicYear: string;
}

export interface ScheduleRecord {
  department: string;
  year: number;
  section: string;
  dayOfWeek: string;
  periodNumber: number;
  timeSlot: string;
  subject: string;
  faculty: string;
  room: string;
  type: 'lecture' | 'lab' | 'tutorial';
  semester: number;
  academicYear: string;
}

export interface HolidayOverrideRecord {
  id?: string;
  department: string;
  year: number;
  section: string;
  date: Date;
  reason: string;
  academicYear: string;
}

export interface CurrentClassResult {
  entry: ScheduleRecord;
  startedAt: Date;
  endsAt: Date;
  elapsedMinutes: number;
  remainingMinutes: number;
}

export interface NextClassResult {
  entry: ScheduleRecord;
  startsAt: Date;
  waitMinutes: number;
  isTomorrow: boolean;
}

export interface ResultRecord {
  studentId: string;
  semester: number;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  grade: string;
  cgpa: number;
}

export interface DetailedResultRecord {
  id?: string;
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
}

export interface SemesterGpaResult {
  semester: number;
  academicYear: string;
  gpa: number;
  totalCredits: number;
  earnedCredits: number;
  subjectCount: number;
  subjects: Array<{
    subjectCode: string;
    subjectName: string;
    credits: number;
    totalMarks: number;
    totalMax: number;
    percentage: number;
    grade: string;
    gradePoints: number;
  }>;
}

export interface CgpaResult {
  studentId: string;
  cgpa: number;
  totalCredits: number;
  earnedCredits: number;
  totalSubjects: number;
  semesters: SemesterGpaResult[];
}

export interface SubjectResultStats {
  subjectCode: string;
  subjectName: string;
  semester: number;
  academicYear: string;
  studentCount: number;
  averagePercentage: number;
  highestPercentage: number;
  lowestPercentage: number;
  passCount: number;
  failCount: number;
  passPercentage: number;
}

export interface UserRecord {
  id: string;
  fullName: string;
  role: 'student' | 'parent';
  studentId: string;
  department: string;
  year: number;
  section: string;
  whatsappNumber: string | null;
}

export interface PublicContentRecord {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  updatedAt: Date;
}

export interface CategoryCountRecord {
  category: string;
  count: number;
}

export interface SubjectRecord {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  type: 'theory' | 'lab' | 'elective';
  faculty: string;
  prerequisites: string[];
  isActive: boolean;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  audience: 'all' | 'students' | 'parents' | 'department';
  department: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isActive: boolean;
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdBy: string;
  createdAt: Date;
}

export interface StudentRecord {
  id: string;
  userId: string;
  studentId: string;
  registerNumber: string;
  rollNumber: string;
  fullName: string;
  email: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: Date;
  department: string;
  program: string;
  semester: number;
  section: string;
  batch: string;
  advisor: string;
  parentId: string | null;
  whatsappNumber: string | null;
  parentWhatsappNumber: string | null;
  status: 'active' | 'graduated' | 'suspended';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}