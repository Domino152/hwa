import type { AttendanceRecord } from './types.js';

export interface IAttendanceRepository {
  findStudentAttendance(studentId: string): Promise<AttendanceRecord[]>;
}
