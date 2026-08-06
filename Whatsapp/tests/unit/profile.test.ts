import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../../src/integration/services/profile.service.js';
import type { AttendanceIntegrationService } from '../../src/integration/services/attendance.service.js';
import type { FeeIntegrationService } from '../../src/integration/services/fee.service.js';
import type { ScheduleIntegrationService } from '../../src/integration/services/schedule.service.js';
import type { ResultIntegrationService } from '../../src/integration/services/result.service.js';

vi.mock('../../src/database/models/User.js', () => {
  return {
    User: {
      findOne: vi.fn(),
    },
  };
});

import { User } from '../../src/database/models/User.js';

const mockAttendance = {
  getByStudentId: vi.fn(),
} as unknown as AttendanceIntegrationService;

const mockFees = {
  getByStudentId: vi.fn(),
} as unknown as FeeIntegrationService;

const mockSchedule = {
  getByStudent: vi.fn(),
} as unknown as ScheduleIntegrationService;

const mockResults = {
  getByStudentId: vi.fn(),
} as unknown as ResultIntegrationService;

const mockUser = {
  _id: 'user123',
  fullName: 'Arjun Sharma',
  studentId: '22CSE001',
  department: 'CSE',
  year: 4,
  section: 'A',
  role: 'student',
  whatsappNumber: '917530063885',
};

const mockParent = {
  _id: 'parent123',
  fullName: 'Suresh Sharma',
  studentId: '22CSE001',
  role: 'parent',
  whatsappNumber: '919876543210',
};

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProfileService(mockAttendance, mockFees, mockSchedule, mockResults);
    vi.mocked(User.findOne).mockReset();
  });

  it('returns full profile for valid student with all data', async () => {
    vi.mocked(User.findOne)
      .mockResolvedValueOnce(mockUser as any)
      .mockResolvedValueOnce(mockParent as any);

    vi.mocked(mockAttendance.getByStudentId).mockResolvedValue({
      records: [{ subject: 'DBMS', percentage: 90, totalClasses: 50, attendedClasses: 45 }],
      overallPercentage: 90,
      hasData: true,
    });
    vi.mocked(mockFees.getByStudentId).mockResolvedValue({
      fee: { totalFee: 100000, paidAmount: 85000, remainingAmount: 15000, dueDate: new Date('2026-08-15'), feeType: 'Tuition', status: 'partial' },
      hasData: true,
    });
    vi.mocked(mockSchedule.getByStudent).mockResolvedValue({
      entries: [{ timeSlot: '09:00-10:00', subject: 'DBMS', room: 'R301', type: 'lecture' }],
      dayOfWeek: 'Monday',
      hasData: true,
    });
    vi.mocked(mockResults.getByStudentId).mockResolvedValue({
      results: [{ subject: 'DBMS', grade: 'A', marksObtained: 92, totalMarks: 100 }],
      cgpa: 9.1,
      hasData: true,
    });

    const result = await service.getStudentProfile('22CSE001');

    expect(result.hasData).toBe(true);
    expect(result.student.fullName).toBe('Arjun Sharma');
    expect(result.student.studentId).toBe('22CSE001');
    expect(result.student.department).toBe('CSE');
    expect(result.student.year).toBe(4);
    expect(result.student.section).toBe('A');
    expect(result.parent).not.toBeNull();
    expect(result.parent!.fullName).toBe('Suresh Sharma');
    expect(result.summary.attendancePercentage).toBe(90);
    expect(result.summary.pendingFeeAmount).toBe(15000);
    expect(result.summary.cgpa).toBe(9.1);
    expect(result.summary.todayClassCount).toBe(1);
    expect(result.status.hasAttendance).toBe(true);
    expect(result.status.hasFees).toBe(true);
    expect(result.status.hasSchedule).toBe(true);
    expect(result.status.hasResults).toBe(true);
    expect(result.status.hasParent).toBe(true);
  });

  it('returns hasData false for unknown studentId', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);

    const result = await service.getStudentProfile('UNKNOWN');

    expect(result.hasData).toBe(false);
    expect(result.student.id).toBe('');
    expect(result.student.fullName).toBe('');
    expect(result.summary.attendancePercentage).toBe(0);
    expect(result.summary.pendingFeeAmount).toBe(0);
    expect(result.summary.cgpa).toBe(0);
    expect(result.summary.todayClassCount).toBe(0);
    expect(result.status.hasAttendance).toBe(false);
    expect(result.status.hasFees).toBe(false);
    expect(result.status.hasSchedule).toBe(false);
    expect(result.status.hasResults).toBe(false);
    expect(result.status.hasParent).toBe(false);
  });

  it('returns parent null when no parent account exists', async () => {
    vi.mocked(User.findOne)
      .mockResolvedValueOnce(mockUser as any)
      .mockResolvedValueOnce(null);

    vi.mocked(mockAttendance.getByStudentId).mockResolvedValue({
      records: [], overallPercentage: 0, hasData: false,
    });
    vi.mocked(mockFees.getByStudentId).mockResolvedValue({
      fee: null, hasData: false,
    });
    vi.mocked(mockSchedule.getByStudent).mockResolvedValue({
      entries: [], dayOfWeek: 'Monday', hasData: false,
    });
    vi.mocked(mockResults.getByStudentId).mockResolvedValue({
      results: [], cgpa: 0, hasData: false,
    });

    const result = await service.getStudentProfile('22CSE001');

    expect(result.parent).toBeNull();
    expect(result.status.hasParent).toBe(false);
  });

  it('returns parent info when parent account exists', async () => {
    vi.mocked(User.findOne)
      .mockResolvedValueOnce(mockUser as any)
      .mockResolvedValueOnce(mockParent as any);

    vi.mocked(mockAttendance.getByStudentId).mockResolvedValue({
      records: [], overallPercentage: 0, hasData: false,
    });
    vi.mocked(mockFees.getByStudentId).mockResolvedValue({
      fee: null, hasData: false,
    });
    vi.mocked(mockSchedule.getByStudent).mockResolvedValue({
      entries: [], dayOfWeek: 'Monday', hasData: false,
    });
    vi.mocked(mockResults.getByStudentId).mockResolvedValue({
      results: [], cgpa: 0, hasData: false,
    });

    const result = await service.getStudentProfile('22CSE001');

    expect(result.parent).not.toBeNull();
    expect(result.parent!.id).toBe('parent123');
    expect(result.parent!.fullName).toBe('Suresh Sharma');
    expect(result.parent!.whatsappNumber).toBe('919876543210');
    expect(result.status.hasParent).toBe(true);
  });

  it('handles empty attendance gracefully', async () => {
    vi.mocked(User.findOne)
      .mockResolvedValueOnce(mockUser as any)
      .mockResolvedValueOnce(null);

    vi.mocked(mockAttendance.getByStudentId).mockResolvedValue({
      records: [], overallPercentage: 0, hasData: false,
    });
    vi.mocked(mockFees.getByStudentId).mockResolvedValue({
      fee: null, hasData: false,
    });
    vi.mocked(mockSchedule.getByStudent).mockResolvedValue({
      entries: [], dayOfWeek: 'Monday', hasData: false,
    });
    vi.mocked(mockResults.getByStudentId).mockResolvedValue({
      results: [], cgpa: 0, hasData: false,
    });

    const result = await service.getStudentProfile('22CSE001');

    expect(result.summary.attendancePercentage).toBe(0);
    expect(result.status.hasAttendance).toBe(false);
    expect(result.attendance.records).toHaveLength(0);
  });

  it('handles empty fees gracefully', async () => {
    vi.mocked(User.findOne)
      .mockResolvedValueOnce(mockUser as any)
      .mockResolvedValueOnce(null);

    vi.mocked(mockAttendance.getByStudentId).mockResolvedValue({
      records: [], overallPercentage: 0, hasData: false,
    });
    vi.mocked(mockFees.getByStudentId).mockResolvedValue({
      fee: null, hasData: false,
    });
    vi.mocked(mockSchedule.getByStudent).mockResolvedValue({
      entries: [], dayOfWeek: 'Monday', hasData: false,
    });
    vi.mocked(mockResults.getByStudentId).mockResolvedValue({
      results: [], cgpa: 0, hasData: false,
    });

    const result = await service.getStudentProfile('22CSE001');

    expect(result.summary.pendingFeeAmount).toBe(0);
    expect(result.status.hasFees).toBe(false);
    expect(result.fees.fee).toBeNull();
  });

  it('handles empty schedule gracefully', async () => {
    vi.mocked(User.findOne)
      .mockResolvedValueOnce(mockUser as any)
      .mockResolvedValueOnce(null);

    vi.mocked(mockAttendance.getByStudentId).mockResolvedValue({
      records: [], overallPercentage: 0, hasData: false,
    });
    vi.mocked(mockFees.getByStudentId).mockResolvedValue({
      fee: null, hasData: false,
    });
    vi.mocked(mockSchedule.getByStudent).mockResolvedValue({
      entries: [], dayOfWeek: 'Monday', hasData: false,
    });
    vi.mocked(mockResults.getByStudentId).mockResolvedValue({
      results: [], cgpa: 0, hasData: false,
    });

    const result = await service.getStudentProfile('22CSE001');

    expect(result.summary.todayClassCount).toBe(0);
    expect(result.status.hasSchedule).toBe(false);
    expect(result.schedule.entries).toHaveLength(0);
  });

  it('handles empty results gracefully', async () => {
    vi.mocked(User.findOne)
      .mockResolvedValueOnce(mockUser as any)
      .mockResolvedValueOnce(null);

    vi.mocked(mockAttendance.getByStudentId).mockResolvedValue({
      records: [], overallPercentage: 0, hasData: false,
    });
    vi.mocked(mockFees.getByStudentId).mockResolvedValue({
      fee: null, hasData: false,
    });
    vi.mocked(mockSchedule.getByStudent).mockResolvedValue({
      entries: [], dayOfWeek: 'Monday', hasData: false,
    });
    vi.mocked(mockResults.getByStudentId).mockResolvedValue({
      results: [], cgpa: 0, hasData: false,
    });

    const result = await service.getStudentProfile('22CSE001');

    expect(result.summary.cgpa).toBe(0);
    expect(result.status.hasResults).toBe(false);
    expect(result.results.results).toHaveLength(0);
  });

  it('computes currentSemester from results', async () => {
    vi.mocked(User.findOne)
      .mockResolvedValueOnce(mockUser as any)
      .mockResolvedValueOnce(null);

    vi.mocked(mockAttendance.getByStudentId).mockResolvedValue({
      records: [], overallPercentage: 0, hasData: false,
    });
    vi.mocked(mockFees.getByStudentId).mockResolvedValue({
      fee: null, hasData: false,
    });
    vi.mocked(mockSchedule.getByStudent).mockResolvedValue({
      entries: [], dayOfWeek: 'Monday', hasData: false,
    });
    vi.mocked(mockResults.getByStudentId).mockResolvedValue({
      results: [
        { subject: 'DBMS', grade: 'A', marksObtained: 92, totalMarks: 100 },
        { subject: 'Java', grade: 'A+', marksObtained: 96, totalMarks: 100 },
        { subject: 'OS', grade: 'B+', marksObtained: 87, totalMarks: 100 },
      ],
      cgpa: 9.1,
      hasData: true,
    });

    const result = await service.getStudentProfile('22CSE001');

    expect(result.currentSemester).toBe(1);
  });

  it('verifies all sub-services are called with correct arguments', async () => {
    vi.mocked(User.findOne)
      .mockResolvedValueOnce(mockUser as any)
      .mockResolvedValueOnce(null);

    vi.mocked(mockAttendance.getByStudentId).mockResolvedValue({
      records: [], overallPercentage: 0, hasData: false,
    });
    vi.mocked(mockFees.getByStudentId).mockResolvedValue({
      fee: null, hasData: false,
    });
    vi.mocked(mockSchedule.getByStudent).mockResolvedValue({
      entries: [], dayOfWeek: 'Monday', hasData: false,
    });
    vi.mocked(mockResults.getByStudentId).mockResolvedValue({
      results: [], cgpa: 0, hasData: false,
    });

    await service.getStudentProfile('22CSE001');

    expect(mockAttendance.getByStudentId).toHaveBeenCalledWith('22CSE001');
    expect(mockFees.getByStudentId).toHaveBeenCalledWith('22CSE001');
    expect(mockSchedule.getByStudent).toHaveBeenCalledWith({
      department: 'CSE',
      year: 4,
      section: 'A',
    });
    expect(mockResults.getByStudentId).toHaveBeenCalledWith('22CSE001');
  });

  it('cross-checks status flags with hasData from each service', async () => {
    vi.mocked(User.findOne)
      .mockResolvedValueOnce(mockUser as any)
      .mockResolvedValueOnce(null);

    vi.mocked(mockAttendance.getByStudentId).mockResolvedValue({
      records: [{ subject: 'DBMS', percentage: 90, totalClasses: 50, attendedClasses: 45 }],
      overallPercentage: 90,
      hasData: true,
    });
    vi.mocked(mockFees.getByStudentId).mockResolvedValue({
      fee: null,
      hasData: false,
    });
    vi.mocked(mockSchedule.getByStudent).mockResolvedValue({
      entries: [{ timeSlot: '09:00-10:00', subject: 'DBMS', room: 'R301', type: 'lecture' }],
      dayOfWeek: 'Monday',
      hasData: true,
    });
    vi.mocked(mockResults.getByStudentId).mockResolvedValue({
      results: [],
      cgpa: 0,
      hasData: false,
    });

    const result = await service.getStudentProfile('22CSE001');

    expect(result.status.hasAttendance).toBe(result.attendance.hasData);
    expect(result.status.hasFees).toBe(result.fees.hasData);
    expect(result.status.hasSchedule).toBe(result.schedule.hasData);
    expect(result.status.hasResults).toBe(result.results.hasData);
  });
});
