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
  whatsappLid: string | null;
  whatsappSessionActive: boolean;
}

export interface PublicContentRecord {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  isActive: boolean;
  createdAt: Date;
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

export type AnnouncementCategory = 'college' | 'department';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AnnouncementAudience = 'all' | 'students' | 'parents' | 'department';

export interface AnnouncementAttachment {
  url: string;
  name: string;
  type: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  audience: AnnouncementAudience;
  department: string | null;
  semester: number | null;
  academicYear: string | null;
  targetSemesters: number[];
  priority: AnnouncementPriority;
  attachments: AnnouncementAttachment[];
  isActive: boolean;
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
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

export type FeeCategory = 'tuition' | 'hostel' | 'exam' | 'lab' | 'transport' | 'library' | 'sports' | 'development' | 'misc';
export type FeeFrequency = 'one_time' | 'semester' | 'yearly';

export interface FeeStructureRecord {
  id?: string;
  code: string;
  name: string;
  category: FeeCategory;
  amount: number;
  frequency: FeeFrequency;
  department: string;
  program: string;
  semester: number | null;
  year: number | null;
  academicYear: string;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type InstallmentStatus = 'upcoming' | 'due' | 'overdue' | 'paid' | 'partial';

export interface InstallmentRecord {
  id?: string;
  installmentNumber: number;
  studentId: string;
  feeStructureId: string;
  feeCode: string;
  feeName: string;
  category: FeeCategory;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  paidDate: Date | null;
  status: InstallmentStatus;
  semester: number;
  academicYear: string;
  lateFine: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'netbanking' | 'cheque' | 'dd' | 'online';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface PaymentRecord {
  id?: string;
  receiptNumber: string;
  studentId: string;
  installmentId: string;
  feeStructureId: string;
  amount: number;
  method: PaymentMethod;
  transactionId: string | null;
  status: PaymentStatus;
  semester: number;
  academicYear: string;
  paidAt: Date;
  collectedBy: string | null;
  remarks: string | null;
  createdAt: Date;
}

export interface ReceiptRecord {
  id?: string;
  receiptNumber: string;
  studentId: string;
  studentName: string;
  paymentId: string;
  installmentId: string;
  feeCode: string;
  feeName: string;
  amount: number;
  totalPaid: number;
  remainingAmount: number;
  method: PaymentMethod;
  transactionId: string | null;
  semester: number;
  academicYear: string;
  generatedAt: Date;
  collectedBy: string | null;
  notes: string | null;
}

export type ScholarshipType = 'merit' | 'need_based' | 'sports' | 'government' | 'institutional' | 'other';
export type ScholarshipStatus = 'active' | 'expired' | 'revoked';

export interface ScholarshipRecord {
  id?: string;
  studentId: string;
  scholarshipName: string;
  type: ScholarshipType;
  amount: number;
  percentage: number | null;
  provider: string;
  validFrom: Date;
  validUntil: Date;
  semester: number | null;
  academicYear: string;
  status: ScholarshipStatus;
  appliedAmount: number;
  reason: string | null;
  approvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FineReason = 'late_payment' | 'absenteeism' | 'damage' | 'library_overdue' | 'discipline' | 'other';

export interface FineRecord {
  id?: string;
  studentId: string;
  reason: FineReason;
  description: string;
  amount: number;
  waivedAmount: number;
  netAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  paidDate: Date | null;
  status: 'pending' | 'paid' | 'partial' | 'waived';
  installmentId: string | null;
  semester: number;
  academicYear: string;
  imposedBy: string | null;
  waivedBy: string | null;
  waiverReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingAmountRecord {
  studentId: string;
  totalPending: number;
  overdueAmount: number;
  upcomingAmount: number;
  fineAmount: number;
  scholarshipCredit: number;
  netPayable: number;
  installmentCount: number;
  overdueCount: number;
  nextDueDate: Date | null;
  nextDueAmount: number | null;
}

export interface PaymentHistoryRecord {
  payments: PaymentRecord[];
  totalPaid: number;
  totalRefunded: number;
  netPaid: number;
  totalTransactions: number;
  byMethod: Record<PaymentMethod, number>;
}

export type AssignmentStatus = 'draft' | 'published' | 'closed';

export interface AssignmentRecord {
  id?: string;
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

export type SubmissionStatus = 'submitted' | 'graded' | 'returned' | 'resubmitted';

export interface AssignmentSubmissionRecord {
  id?: string;
  assignmentId: string;
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