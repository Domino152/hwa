import type { IAttendanceRepository, MonthlyReport, SemesterReport, AttendanceAnalytics, AttendanceSummary } from '../../repositories/attendance.repository.js';
import type { DailyAttendanceRecord, AttendanceStatus } from '../../repositories/types.js';
import { NotFoundError } from '../../shared/utils/errors.js';

const ATTENDANCE_THRESHOLD = 75;

export interface AttendanceRecordInput {
  studentId: string;
  subject: string;
  totalClasses: number;
  attendedClasses: number;
  percentage?: number;
  semester: number;
  academicYear: string;
}

export interface DailyAttendanceInput {
  studentId: string;
  subject: string;
  date: Date;
  status: AttendanceStatus;
  markedBy?: string | null;
  semester: number;
  academicYear: string;
  notes?: string | null;
}

export interface BulkDailyAttendanceInput {
  records: DailyAttendanceInput[];
}

export interface BelowThresholdAlert {
  studentId: string;
  percentage: number;
  totalClasses: number;
  attendedClasses: number;
  notificationsCreated: number;
}

export interface AttendanceAlertService {
  checkAttendanceAlert(studentId: string, percentage: number): Promise<unknown[]>;
}

export class AttendanceService {
  constructor(
    private readonly repo: IAttendanceRepository,
    private readonly alertService?: AttendanceAlertService,
  ) {}

  // --- Aggregate (existing) ---

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

  // --- Daily Attendance ---

  async markDailyAttendance(input: DailyAttendanceInput): Promise<DailyAttendanceRecord> {
    const record: DailyAttendanceRecord = {
      studentId: input.studentId,
      subject: input.subject,
      date: input.date,
      status: input.status,
      markedBy: input.markedBy ?? null,
      semester: input.semester,
      academicYear: input.academicYear,
      notes: input.notes ?? null,
    };

    const marked = await this.repo.markDailyAttendance(record);

    await this.checkAndUpdateAggregate(input.studentId, input.subject, input.semester, input.academicYear);

    return marked;
  }

  async markBulkDailyAttendance(input: BulkDailyAttendanceInput): Promise<number> {
    const records: DailyAttendanceRecord[] = input.records.map((r) => ({
      studentId: r.studentId,
      subject: r.subject,
      date: r.date,
      status: r.status,
      markedBy: r.markedBy ?? null,
      semester: r.semester,
      academicYear: r.academicYear,
      notes: r.notes ?? null,
    }));

    const count = await this.repo.markBulkDailyAttendance(records);

    const studentSubjectPairs = new Set<string>();
    for (const r of input.records) {
      studentSubjectPairs.add(`${r.studentId}|${r.subject}|${r.semester}|${r.academicYear}`);
    }

    for (const key of studentSubjectPairs) {
      const parts = key.split('|');
      if (parts.length >= 4) {
        await this.checkAndUpdateAggregate(parts[0]!, parts[1]!, Number(parts[2]), parts[3]!);
      }
    }

    return count;
  }

  async getDailyByStudentAndDate(studentId: string, date: Date) {
    return this.repo.findDailyByStudentAndDate(studentId, date);
  }

  async getDailyByStudentAndSubject(studentId: string, subject: string, startDate: Date, endDate: Date) {
    return this.repo.findDailyByStudentAndSubject(studentId, subject, startDate, endDate);
  }

  async getDailyByStudentAndSemester(studentId: string, semester: number, academicYear: string) {
    return this.repo.findDailyByStudentAndSemester(studentId, semester, academicYear);
  }

  async getDailyByDateRange(startDate: Date, endDate: Date, semester: number, academicYear: string) {
    return this.repo.findDailyByDateRange(startDate, endDate, semester, academicYear);
  }

  // --- Monthly Report ---

  async getMonthlyReport(studentId: string, month: number, year: number, semester: number, academicYear: string): Promise<MonthlyReport> {
    return this.repo.getMonthlyReport(studentId, month, year, semester, academicYear);
  }

  // --- Semester Report ---

  async getSemesterReport(studentId: string, semester: number, academicYear: string): Promise<SemesterReport> {
    return this.repo.getSemesterReport(studentId, semester, academicYear);
  }

  // --- Analytics ---

  async getAnalytics(studentId: string, semester: number, academicYear: string): Promise<AttendanceAnalytics> {
    return this.repo.getAttendanceAnalytics(studentId, semester, academicYear);
  }

  // --- Summary ---

  async getSummary(studentId: string, semester: number, academicYear: string): Promise<AttendanceSummary> {
    return this.repo.getAttendanceSummary(studentId, semester, academicYear);
  }

  // --- Below-75% Detection ---

  async getStudentsBelowThreshold(semester: number, academicYear: string, threshold = ATTENDANCE_THRESHOLD) {
    return this.repo.getStudentsBelowThreshold(semester, academicYear, threshold);
  }

  async detectBelowThresholdAndAlert(semester: number, academicYear: string): Promise<BelowThresholdAlert[]> {
    const students = await this.repo.getStudentsBelowThreshold(semester, academicYear);
    const alerts: BelowThresholdAlert[] = [];

    for (const student of students) {
      let notificationsCreated = 0;

      if (this.alertService) {
        const results = await this.alertService.checkAttendanceAlert(student.studentId, student.percentage);
        notificationsCreated = results.length;
      }

      alerts.push({
        studentId: student.studentId,
        percentage: student.percentage,
        totalClasses: student.totalClasses,
        attendedClasses: student.attendedClasses,
        notificationsCreated,
      });
    }

    return alerts;
  }

  // --- History ---

  async getHistory(studentId: string, page = 1, limit = 20) {
    return this.repo.getAttendanceHistory(studentId, page, limit);
  }

  // --- Faculty Marking Lookup ---

  async getFacultyMarkedRecords(facultyId: string, date: Date, semester: number, academicYear: string) {
    return this.repo.getFacultyMarkedRecords(facultyId, date, semester, academicYear);
  }

  // --- Private Helpers ---

  private async checkAndUpdateAggregate(
    studentId: string,
    subject: string,
    semester: number,
    academicYear: string,
  ): Promise<void> {
    const dailyRecords = await this.repo.findDailyByStudentAndSubject(
      studentId,
      subject,
      new Date('2000-01-01'),
      new Date('2100-12-31'),
    );

    const semesterRecords = dailyRecords.filter(
      (r) => r.semester === semester && r.academicYear === academicYear,
    );

    const totalClasses = semesterRecords.length;
    const attendedClasses = semesterRecords.filter(
      (r) => r.status === 'present' || r.status === 'late',
    ).length;
    const percentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;

    await this.repo.upsertAttendance({
      studentId,
      subject,
      totalClasses,
      attendedClasses,
      percentage,
      semester,
      academicYear,
    });
  }
}
