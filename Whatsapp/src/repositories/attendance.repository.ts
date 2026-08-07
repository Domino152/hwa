import type { AttendanceRecord, DailyAttendanceRecord } from './types.js';

export interface MonthlyReport {
  month: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
}

export interface SemesterReport {
  semester: number;
  academicYear: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  subjectWise: Array<{
    subject: string;
    totalClasses: number;
    attendedClasses: number;
    percentage: number;
  }>;
}

export interface AttendanceAnalytics {
  studentId: string;
  overallPercentage: number;
  totalClasses: number;
  attendedClasses: number;
  subjectWise: Array<{
    subject: string;
    percentage: number;
    totalClasses: number;
    attendedClasses: number;
    trend: 'improving' | 'declining' | 'stable';
  }>;
  monthlyTrend: MonthlyReport[];
  belowThreshold: boolean;
  riskLevel: 'safe' | 'warning' | 'critical';
}

export interface AttendanceSummary {
  studentId: string;
  overallPercentage: number;
  totalSubjects: number;
  subjectsAbove75: number;
  subjectsBelow75: number;
  totalClassesHeld: number;
  totalClassesAttended: number;
  classesNeededFor75: number;
  currentSemester: number;
  academicYear: string;
}

export interface IAttendanceRepository {
  findStudentAttendance(studentId: string): Promise<AttendanceRecord[]>;
  findByStudentAndSubject(studentId: string, subject: string): Promise<AttendanceRecord | null>;
  findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<AttendanceRecord[]>;
  upsertAttendance(record: AttendanceRecord): Promise<AttendanceRecord>;
  upsertMany(records: AttendanceRecord[]): Promise<number>;
  getDepartmentStats(department: string, semester: number, academicYear: string): Promise<Array<{ subject: string; averagePercentage: number; totalStudents: number }>>;

  // Daily attendance
  markDailyAttendance(record: DailyAttendanceRecord): Promise<DailyAttendanceRecord>;
  markBulkDailyAttendance(records: DailyAttendanceRecord[]): Promise<number>;
  findDailyByStudentAndDate(studentId: string, date: Date): Promise<DailyAttendanceRecord[]>;
  findDailyByStudentAndSubject(studentId: string, subject: string, startDate: Date, endDate: Date): Promise<DailyAttendanceRecord[]>;
  findDailyByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<DailyAttendanceRecord[]>;
  findDailyByDateRange(startDate: Date, endDate: Date, semester: number, academicYear: string): Promise<DailyAttendanceRecord[]>;

  // Monthly report
  getMonthlyReport(studentId: string, month: number, year: number, semester: number, academicYear: string): Promise<MonthlyReport>;

  // Semester report
  getSemesterReport(studentId: string, semester: number, academicYear: string): Promise<SemesterReport>;

  // Analytics
  getAttendanceAnalytics(studentId: string, semester: number, academicYear: string): Promise<AttendanceAnalytics>;

  // Summary
  getAttendanceSummary(studentId: string, semester: number, academicYear: string): Promise<AttendanceSummary>;

  // Below threshold detection
  getStudentsBelowThreshold(semester: number, academicYear: string, threshold?: number): Promise<Array<{ studentId: string; percentage: number; totalClasses: number; attendedClasses: number }>>;

  // History
  getAttendanceHistory(studentId: string, page: number, limit: number): Promise<{ records: DailyAttendanceRecord[]; total: number }>;

  // Faculty marking lookup
  getFacultyMarkedRecords(facultyId: string, date: Date, semester: number, academicYear: string): Promise<DailyAttendanceRecord[]>;
}
