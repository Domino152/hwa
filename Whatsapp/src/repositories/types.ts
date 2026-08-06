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
  timeSlot: string;
  subject: string;
  room: string;
  type: 'lecture' | 'lab' | 'tutorial';
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
