import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttendanceService, type AttendanceAlertService } from '../../src/modules/attendance/attendance.service.js';
import type { IAttendanceRepository } from '../../src/repositories/attendance.repository.js';
import type { AttendanceRecord, DailyAttendanceRecord } from '../../src/repositories/types.js';

function createMockRepo(): IAttendanceRepository {
  return {
    findStudentAttendance: vi.fn().mockResolvedValue([]),
    findByStudentAndSubject: vi.fn().mockResolvedValue(null),
    findByStudentAndSemester: vi.fn().mockResolvedValue([]),
    upsertAttendance: vi.fn().mockImplementation((r: AttendanceRecord) => Promise.resolve(r)),
    upsertMany: vi.fn().mockImplementation((records: AttendanceRecord[]) => Promise.resolve(records.length)),
    getDepartmentStats: vi.fn().mockResolvedValue([]),
    markDailyAttendance: vi.fn().mockImplementation((r: DailyAttendanceRecord) => Promise.resolve(r)),
    markBulkDailyAttendance: vi.fn().mockImplementation((records: DailyAttendanceRecord[]) => Promise.resolve(records.length)),
    findDailyByStudentAndDate: vi.fn().mockResolvedValue([]),
    findDailyByStudentAndSubject: vi.fn().mockResolvedValue([]),
    findDailyByStudentAndSemester: vi.fn().mockResolvedValue([]),
    findDailyByDateRange: vi.fn().mockResolvedValue([]),
    getMonthlyReport: vi.fn().mockResolvedValue({ month: 'Jan 2026', totalClasses: 0, attendedClasses: 0, percentage: 0 }),
    getSemesterReport: vi.fn().mockResolvedValue({ semester: 1, academicYear: '2025-26', totalClasses: 0, attendedClasses: 0, percentage: 0, subjectWise: [] }),
    getAttendanceAnalytics: vi.fn().mockResolvedValue({
      studentId: '22CSE001', overallPercentage: 85, totalClasses: 100, attendedClasses: 85,
      subjectWise: [], monthlyTrend: [], belowThreshold: false, riskLevel: 'safe',
    }),
    getAttendanceSummary: vi.fn().mockResolvedValue({
      studentId: '22CSE001', overallPercentage: 85, totalSubjects: 5, subjectsAbove75: 4, subjectsBelow75: 1,
      totalClassesHeld: 100, totalClassesAttended: 85, classesNeededFor75: 0, currentSemester: 1, academicYear: '2025-26',
    }),
    getStudentsBelowThreshold: vi.fn().mockResolvedValue([]),
    getAttendanceHistory: vi.fn().mockResolvedValue({ records: [], total: 0 }),
    getFacultyMarkedRecords: vi.fn().mockResolvedValue([]),
  };
}

describe('AttendanceService', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let service: AttendanceService;

  beforeEach(() => {
    repo = createMockRepo();
    service = new AttendanceService(repo);
  });

  describe('getByStudentId', () => {
    it('returns records from repository', async () => {
      const mockRecords: AttendanceRecord[] = [
        { studentId: '22CSE001', subject: 'Math', totalClasses: 50, attendedClasses: 45, percentage: 90, semester: 1, academicYear: '2025-26' },
      ];
      repo.findStudentAttendance.mockResolvedValue(mockRecords);

      const result = await service.getByStudentId('22CSE001');
      expect(result).toEqual(mockRecords);
      expect(repo.findStudentAttendance).toHaveBeenCalledWith('22CSE001');
    });
  });

  describe('getByStudentAndSubject', () => {
    it('returns single record', async () => {
      const mock: AttendanceRecord = { studentId: '22CSE001', subject: 'Math', totalClasses: 50, attendedClasses: 45, percentage: 90, semester: 1, academicYear: '2025-26' };
      repo.findByStudentAndSubject.mockResolvedValue(mock);

      const result = await service.getByStudentAndSubject('22CSE001', 'Math');
      expect(result).toEqual(mock);
    });

    it('returns null when not found', async () => {
      const result = await service.getByStudentAndSubject('22CSE001', 'Unknown');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('calculates percentage and upserts', async () => {
      const input = { studentId: '22CSE001', subject: 'Physics', totalClasses: 40, attendedClasses: 38, semester: 1, academicYear: '2025-26' };
      await service.create(input);

      expect(repo.upsertAttendance).toHaveBeenCalledWith(
        expect.objectContaining({ percentage: 95 }),
      );
    });

    it('returns 0 percentage when totalClasses is 0', async () => {
      const input = { studentId: '22CSE001', subject: 'Physics', totalClasses: 0, attendedClasses: 0, semester: 1, academicYear: '2025-26' };
      await service.create(input);

      expect(repo.upsertAttendance).toHaveBeenCalledWith(
        expect.objectContaining({ percentage: 0 }),
      );
    });
  });

  describe('update', () => {
    it('updates existing record with new values', async () => {
      const existing: AttendanceRecord = { studentId: '22CSE001', subject: 'Math', totalClasses: 50, attendedClasses: 40, percentage: 80, semester: 1, academicYear: '2025-26' };
      repo.findByStudentAndSubject.mockResolvedValue(existing);

      await service.update('22CSE001', 'Math', 1, '2025-26', { attendedClasses: 48 });

      expect(repo.upsertAttendance).toHaveBeenCalledWith(
        expect.objectContaining({ totalClasses: 50, attendedClasses: 48, percentage: 96 }),
      );
    });

    it('throws NotFoundError when record does not exist', async () => {
      repo.findByStudentAndSubject.mockResolvedValue(null);
      await expect(service.update('22CSE001', 'Math', 1, '2025-26', { attendedClasses: 48 }))
        .rejects.toThrow('Attendance record not found');
    });
  });

  describe('bulkCreate', () => {
    it('upserts multiple records with calculated percentages', async () => {
      const records = [
        { studentId: '22CSE001', subject: 'Math', totalClasses: 50, attendedClasses: 45, semester: 1, academicYear: '2025-26' },
        { studentId: '22CSE001', subject: 'Science', totalClasses: 40, attendedClasses: 38, semester: 1, academicYear: '2025-26' },
      ];
      const count = await service.bulkCreate(records);
      expect(count).toBe(2);
      expect(repo.upsertMany).toHaveBeenCalled();
    });
  });

  describe('getDepartmentStats', () => {
    it('delegates to repository', async () => {
      const stats = [{ subject: 'Math', averagePercentage: 85, totalStudents: 30 }];
      repo.getDepartmentStats.mockResolvedValue(stats);

      const result = await service.getDepartmentStats('CSE', 1, '2025-26');
      expect(result).toEqual(stats);
      expect(repo.getDepartmentStats).toHaveBeenCalledWith('CSE', 1, '2025-26');
    });
  });

  describe('markDailyAttendance', () => {
    it('marks attendance and updates aggregate', async () => {
      const input = {
        studentId: '22CSE001', subject: 'Math', date: new Date('2026-01-15'),
        status: 'present' as const, semester: 1, academicYear: '2025-26',
      };

      const result = await service.markDailyAttendance(input);
      expect(result.status).toBe('present');
      expect(repo.markDailyAttendance).toHaveBeenCalled();
      expect(repo.findDailyByStudentAndSubject).toHaveBeenCalled();
      expect(repo.upsertAttendance).toHaveBeenCalled();
    });

    it('includes markedBy and notes when provided', async () => {
      const input = {
        studentId: '22CSE001', subject: 'Math', date: new Date('2026-01-15'),
        status: 'late' as const, markedBy: 'faculty123', semester: 1, academicYear: '2025-26',
        notes: 'Arrived 10 minutes late',
      };

      const result = await service.markDailyAttendance(input);
      expect(result.markedBy).toBe('faculty123');
      expect(result.notes).toBe('Arrived 10 minutes late');
    });
  });

  describe('markBulkDailyAttendance', () => {
    it('marks multiple records and updates aggregates', async () => {
      const input = {
        records: [
          { studentId: '22CSE001', subject: 'Math', date: new Date('2026-01-15'), status: 'present' as const, semester: 1, academicYear: '2025-26' },
          { studentId: '22CSE002', subject: 'Math', date: new Date('2026-01-15'), status: 'absent' as const, semester: 1, academicYear: '2025-26' },
        ],
      };

      const count = await service.markBulkDailyAttendance(input);
      expect(count).toBe(2);
      expect(repo.markBulkDailyAttendance).toHaveBeenCalled();
    });
  });

  describe('getDailyByStudentAndDate', () => {
    it('returns records for a specific date', async () => {
      const mockRecords: DailyAttendanceRecord[] = [
        { studentId: '22CSE001', subject: 'Math', date: new Date('2026-01-15'), status: 'present', markedBy: null, semester: 1, academicYear: '2025-26', notes: null },
      ];
      repo.findDailyByStudentAndDate.mockResolvedValue(mockRecords);

      const result = await service.getDailyByStudentAndDate('22CSE001', new Date('2026-01-15'));
      expect(result).toHaveLength(1);
    });
  });

  describe('getMonthlyReport', () => {
    it('returns monthly report', async () => {
      const report = { month: 'Jan 2026', totalClasses: 20, attendedClasses: 18, percentage: 90 };
      repo.getMonthlyReport.mockResolvedValue(report);

      const result = await service.getMonthlyReport('22CSE001', 1, 2026, 1, '2025-26');
      expect(result).toEqual(report);
      expect(repo.getMonthlyReport).toHaveBeenCalledWith('22CSE001', 1, 2026, 1, '2025-26');
    });
  });

  describe('getSemesterReport', () => {
    it('returns semester report', async () => {
      const report = { semester: 1, academicYear: '2025-26', totalClasses: 100, attendedClasses: 85, percentage: 85, subjectWise: [] };
      repo.getSemesterReport.mockResolvedValue(report);

      const result = await service.getSemesterReport('22CSE001', 1, '2025-26');
      expect(result).toEqual(report);
    });
  });

  describe('getAnalytics', () => {
    it('returns analytics data', async () => {
      const analytics = {
        studentId: '22CSE001', overallPercentage: 85, totalClasses: 100, attendedClasses: 85,
        subjectWise: [], monthlyTrend: [], belowThreshold: false, riskLevel: 'safe' as const,
      };
      repo.getAttendanceAnalytics.mockResolvedValue(analytics);

      const result = await service.getAnalytics('22CSE001', 1, '2025-26');
      expect(result.overallPercentage).toBe(85);
      expect(result.riskLevel).toBe('safe');
    });
  });

  describe('getSummary', () => {
    it('returns attendance summary', async () => {
      const summary = {
        studentId: '22CSE001', overallPercentage: 85, totalSubjects: 5, subjectsAbove75: 4, subjectsBelow75: 1,
        totalClassesHeld: 100, totalClassesAttended: 85, classesNeededFor75: 0, currentSemester: 1, academicYear: '2025-26',
      };
      repo.getAttendanceSummary.mockResolvedValue(summary);

      const result = await service.getSummary('22CSE001', 1, '2025-26');
      expect(result).toEqual(summary);
    });
  });

  describe('getStudentsBelowThreshold', () => {
    it('returns students below threshold', async () => {
      const students = [{ studentId: '22CSE005', percentage: 65, totalClasses: 50, attendedClasses: 33 }];
      repo.getStudentsBelowThreshold.mockResolvedValue(students);

      const result = await service.getStudentsBelowThreshold(1, '2025-26');
      expect(result).toEqual(students);
      expect(repo.getStudentsBelowThreshold).toHaveBeenCalledWith(1, '2025-26', 75);
    });

    it('supports custom threshold', async () => {
      await service.getStudentsBelowThreshold(1, '2025-26', 80);
      expect(repo.getStudentsBelowThreshold).toHaveBeenCalledWith(1, '2025-26', 80);
    });
  });

  describe('detectBelowThresholdAndAlert', () => {
    it('creates alerts for below-threshold students', async () => {
      repo.getStudentsBelowThreshold.mockResolvedValue([
        { studentId: '22CSE005', percentage: 65, totalClasses: 50, attendedClasses: 33 },
      ]);

      const alertService: AttendanceAlertService = {
        checkAttendanceAlert: vi.fn().mockResolvedValue([{ id: 'notif1' }, { id: 'notif2' }]),
      };
      const serviceWithAlerts = new AttendanceService(repo, alertService);

      const alerts = await serviceWithAlerts.detectBelowThresholdAndAlert(1, '2025-26');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].notificationsCreated).toBe(2);
      expect(alertService.checkAttendanceAlert).toHaveBeenCalledWith('22CSE005', 65);
    });

    it('returns zero notifications when no alert service', async () => {
      repo.getStudentsBelowThreshold.mockResolvedValue([
        { studentId: '22CSE005', percentage: 65, totalClasses: 50, attendedClasses: 33 },
      ]);

      const alerts = await service.detectBelowThresholdAndAlert(1, '2025-26');
      expect(alerts[0].notificationsCreated).toBe(0);
    });

    it('returns empty when all students above threshold', async () => {
      repo.getStudentsBelowThreshold.mockResolvedValue([]);

      const alerts = await service.detectBelowThresholdAndAlert(1, '2025-26');
      expect(alerts).toHaveLength(0);
    });
  });

  describe('getHistory', () => {
    it('returns paginated history', async () => {
      const history = {
        records: [{ studentId: '22CSE001', subject: 'Math', date: new Date(), status: 'present' as const, markedBy: null, semester: 1, academicYear: '2025-26', notes: null }],
        total: 50,
      };
      repo.getAttendanceHistory.mockResolvedValue(history);

      const result = await service.getHistory('22CSE001', 1, 20);
      expect(result.total).toBe(50);
      expect(repo.getAttendanceHistory).toHaveBeenCalledWith('22CSE001', 1, 20);
    });

    it('defaults to page 1, limit 20', async () => {
      await service.getHistory('22CSE001');
      expect(repo.getAttendanceHistory).toHaveBeenCalledWith('22CSE001', 1, 20);
    });
  });

  describe('getFacultyMarkedRecords', () => {
    it('returns records marked by faculty', async () => {
      const records: DailyAttendanceRecord[] = [
        { studentId: '22CSE001', subject: 'Math', date: new Date('2026-01-15'), status: 'present', markedBy: 'faculty1', semester: 1, academicYear: '2025-26', notes: null },
      ];
      repo.getFacultyMarkedRecords.mockResolvedValue(records);

      const result = await service.getFacultyMarkedRecords('faculty1', new Date('2026-01-15'), 1, '2025-26');
      expect(result).toHaveLength(1);
      expect(repo.getFacultyMarkedRecords).toHaveBeenCalledWith('faculty1', new Date('2026-01-15'), 1, '2025-26');
    });
  });
});
