import type { AttendanceRecord } from './types.js';

export interface IAttendanceRepository {
  findStudentAttendance(studentId: string): Promise<AttendanceRecord[]>;
  findByStudentAndSubject(studentId: string, subject: string): Promise<AttendanceRecord | null>;
  findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<AttendanceRecord[]>;
  upsertAttendance(record: AttendanceRecord): Promise<AttendanceRecord>;
  upsertMany(records: AttendanceRecord[]): Promise<number>;
  getDepartmentStats(department: string, semester: number, academicYear: string): Promise<Array<{ subject: string; averagePercentage: number; totalStudents: number }>>;
}
