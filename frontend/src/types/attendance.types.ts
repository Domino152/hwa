export interface AttendanceRecord {
  _id: string;
  studentId: string;
  registerNumber: string;
  studentName: string;
  department: string;
  year: number;
  section: string;
  date: string;
  subject: string;
  status: "present" | "absent";
  lateMinutes: number;
  lateSeconds: number;
  facultyName: string;
  createdAt: string;
}

export interface AttendancePayload {
  records: {
    studentId: string;
    registerNumber: string;
    studentName: string;
    department: string;
    year: number;
    section: string;
    status: "present" | "absent";
    lateMinutes?: number;
    lateSeconds?: number;
  }[];
  date: string;
  subject: string;
  facultyName: string;
}

export interface AttendanceFilters {
  date?: string;
  department?: string;
  subject?: string;
  studentId?: string;
}

export interface AttendanceSummary {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  attendancePercentage: number;
  recentRecords: AttendanceRecord[];
}

export interface SessionRecord {
  studentId: string;
  registerNumber: string;
  studentName: string;
  status: "present" | "absent";
  lateMinutes: number;
  lateSeconds: number;
}

export interface AttendanceSession {
  date: string;
  subject: string;
  records: SessionRecord[];
}

export interface SessionsResponse {
  sessions: AttendanceSession[];
  students: {
    _id: string;
    fullName: string;
    registerNumber: string;
  }[];
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
