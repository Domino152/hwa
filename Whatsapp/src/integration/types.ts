export interface AttendanceData {
  subject: string;
  percentage: number;
  totalClasses: number;
  attendedClasses: number;
}

export interface AttendanceResult {
  records: AttendanceData[];
  overallPercentage: number;
  hasData: boolean;
}

export interface FeeData {
  totalFee: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  feeType: string;
  status: 'paid' | 'partial' | 'pending';
}

export interface FeeResult {
  fee: FeeData | null;
  hasData: boolean;
}

export interface ScheduleEntry {
  timeSlot: string;
  subject: string;
  room: string;
  type: 'lecture' | 'lab' | 'tutorial';
}

export interface ScheduleResult {
  entries: ScheduleEntry[];
  dayOfWeek: string;
  hasData: boolean;
}

export interface ResultData {
  subject: string;
  grade: string;
  marksObtained: number;
  totalMarks: number;
}

export interface DetailedResultData {
  subjectCode: string;
  subjectName: string;
  semester: number;
  internalMarks: number | null;
  externalMarks: number | null;
  assignmentMarks: number | null;
  labMarks: number | null;
  totalMarks: number;
  totalMax: number;
  percentage: number;
  credits: number;
  grade: string;
  gradePoints: number;
}

export interface SemesterGpaData {
  semester: number;
  academicYear: string;
  gpa: number;
  totalCredits: number;
  earnedCredits: number;
  subjectCount: number;
}

export interface CgpaData {
  cgpa: number;
  totalCredits: number;
  earnedCredits: number;
  totalSubjects: number;
  semesters: SemesterGpaData[];
}

export interface ResultResult {
  results: ResultData[];
  cgpa: number;
  hasData: boolean;
}

export interface DetailedResultResult {
  results: DetailedResultData[];
  cgpa: CgpaData;
  hasData: boolean;
}

export interface UserData {
  id: string;
  fullName: string;
  role: 'student' | 'parent';
  studentId: string;
  department: string;
  year: number;
  section: string;
}

export interface StudentProfileResult {
  student: {
    id: string;
    fullName: string;
    studentId: string;
    department: string;
    year: number;
    section: string;
  };
  attendance: AttendanceResult;
  fees: FeeResult;
  schedule: ScheduleResult;
  results: ResultResult;
  detailedResults: DetailedResultResult;
  parent: {
    id: string;
    fullName: string;
    whatsappNumber: string | null;
  } | null;
  currentSemester: number;
  hasData: boolean;
  summary: {
    attendancePercentage: number;
    pendingFeeAmount: number;
    cgpa: number;
    overallCgpa: number;
    todayClassCount: number;
  };
  status: {
    hasAttendance: boolean;
    hasFees: boolean;
    hasSchedule: boolean;
    hasResults: boolean;
    hasDetailedResults: boolean;
    hasParent: boolean;
  };
}

export interface PublicContentData {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  updatedAt: Date;
}

export interface PublicInformationResult {
  entries: PublicContentData[];
  category: string;
  hasData: boolean;
}

export interface CategoryCount {
  category: string;
  count: number;
}
