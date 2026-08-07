import type { IAttendanceRepository } from '../../repositories/attendance.repository.js';
import { NotFoundError } from '../../shared/utils/errors.js';

export interface AttendanceRecordInput {
  studentId: string;
  subject: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  semester: number;
  academicYear: string;
}

export class AttendanceService {
  constructor(private readonly repo: IAttendanceRepository) {}

  async getByStudentId(studentId: string) {
    return this.repo.findStudentAttendance(studentId);
  }

  async getByStudentAndSubject(studentId: string, subject: string) {
    return this.repo.findByStudentAndSubject(studentId, subject);
  }

  async getByStudentAndSemester(studentId: string, semester: number, academicYear: string) {
    return this.repo.findByStudentAndSemester(studentId, semester, academicYear);
  }

  async create(record: AttendanceRecordInput) {
    const percentage = record.totalClasses > 0
      ? Math.round((record.attendedClasses / record.totalClasses) * 100)
      : 0;
    return this.repo.upsertAttendance({ ...record, percentage });
  }

  async update(studentId: string, subject: string, semester: number, academicYear: string, data: { totalClasses?: number; attendedClasses?: number }) {
    const existing = await this.repo.findByStudentAndSubject(studentId, subject);
    if (!existing) throw new NotFoundError('Attendance record');

    const totalClasses = data.totalClasses ?? existing.totalClasses;
    const attendedClasses = data.attendedClasses ?? existing.attendedClasses;
    const percentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;

    return this.repo.upsertAttendance({
      studentId,
      subject,
      totalClasses,
      attendedClasses,
      percentage,
      semester,
      academicYear,
    });
  }

  async bulkCreate(records: AttendanceRecordInput[]): Promise<number> {
    const withPercentages = records.map((r) => ({
      ...r,
      percentage: r.totalClasses > 0 ? Math.round((r.attendedClasses / r.totalClasses) * 100) : 0,
    }));
    return this.repo.upsertMany(withPercentages);
  }

  async getDepartmentStats(department: string, semester: number, academicYear: string) {
    return this.repo.getDepartmentStats(department, semester, academicYear);
  }
}
