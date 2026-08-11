export type DailyStatus = "present" | "absent" | "late" | "excused";

export interface DailyAttendanceRecord {
  studentId: string;
  subject: string;
  date: string;
  status: DailyStatus;
  semester: number;
  academicYear: string;
  notes?: string | null;
}

export interface MarkDailyRecord {
  studentId: string;
  subject: string;
  date: string;
  status: DailyStatus;
  semester: number;
  academicYear: string;
  notes?: string;
}

export interface MarkDailyPayload {
  records: MarkDailyRecord[];
}

export interface DateRangeParams {
  startDate: string;
  endDate: string;
  semester: number;
  academicYear: string;
}

export interface DateRangeResponse {
  records: DailyAttendanceRecord[];
  total: number;
  hasData: boolean;
}

export interface DashboardSummary {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendancePercentage: number;
  recentRecords: DailyAttendanceRecord[];
}

export const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Computer Science",
  "English",
  "Data Structures",
  "Algorithms",
  "Database Systems",
  "Operating Systems",
  "Computer Networks",
] as const;
