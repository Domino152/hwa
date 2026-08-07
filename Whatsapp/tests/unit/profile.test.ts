import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../../src/integration/services/profile.service.js';
import type { AttendanceIntegrationService } from '../../src/integration/services/attendance.service.js';
import type { FeeIntegrationService } from '../../src/integration/services/fee.service.js';
import type { ScheduleIntegrationService } from '../../src/integration/services/schedule.service.js';
import type { ResultIntegrationService } from '../../src/integration/services/result.service.js';
import type { DetailedResultIntegrationService } from '../../src/integration/services/detailed-result.service.js';
import type { IUserRepository } from '../../src/repositories/user.repository.js';

vi.mock('../../src/integration/index.js', () => ({
  integration: {
    findUserByPhone: vi.fn().mockResolvedValue(null),
    attendance: { getByStudentId: vi.fn().mockResolvedValue({ records: [], overallPercentage: 0, hasData: false }) },
    fees: { getByStudentId: vi.fn().mockResolvedValue({ fee: null, hasData: false }) },
    schedule: { getByStudent: vi.fn().mockResolvedValue({ entries: [], dayOfWeek: 'Monday', hasData: false }) },
    results: { getByStudentId: vi.fn().mockResolvedValue({ results: [], cgpa: 0, hasData: false }) },
    detailedResults: { getByStudentId: vi.fn().mockResolvedValue({
      results: [],
      cgpa: { cgpa: 0, totalCredits: 0, earnedCredits: 0, totalSubjects: 0, semesters: [] },
      hasData: false,
    }) },
    publicInformation: {
      resolveCategory: vi.fn().mockReturnValue('about_hits'),
      getByCategory: vi.fn().mockResolvedValue({ entries: [], category: 'about_hits', hasData: false }),
      search: vi.fn().mockResolvedValue({ entries: [], category: 'about_hits', hasData: false }),
      getCategoryCounts: vi.fn().mockResolvedValue([]),
    },
  },
}));

const mockUserRepo: IUserRepository = {
  findByPhone: vi.fn(),
  findByStudentId: vi.fn(),
  findParentByStudentId: vi.fn(),
};

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

const mockDetailedResults = {
  getByStudentId: vi.fn(),
} as unknown as DetailedResultIntegrationService;

const mockUser = {
  id: 'user123',
  fullName: 'Arjun Sharma',
  studentId: '22CSE001',
  department: 'CSE',
  year: 4,
  section: 'A',
  role: 'student' as const,
  whatsappNumber: '917530063885',
};

const mockParent = {
  id: 'parent123',
  fullName: 'Suresh Sharma',
  studentId: '22CSE001',
  role: 'parent' as const,
  department: 'CSE',
  year: 4,
  section: 'A',
  whatsappNumber: '919876543210',
};

function setupEmptyMocks(): void {
  vi.mocked(mockDetailedResults.getByStudentId).mockResolvedValue({
    results: [],
    cgpa: { cgpa: 0, totalCredits: 0, earnedCredits: 0, totalSubjects: 0, semesters: [] },
    hasData: false,
  });
}

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProfileService(
      mockUserRepo,
      mockAttendance,
      mockFees,
      mockSchedule,
      mockResults,
      mockDetailedResults,
    );
    setupEmptyMocks();
  });

  it('returns full profile for valid student with all data', async () => {
    vi.mocked(mockUserRepo.findByStudentId).mockResolvedValue(mockUser);
    vi.mocked(mockUserRepo.findParentByStudentId).mockResolvedValue(mockParent);

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
    vi.mocked(mockDetailedResults.getByStudentId).mockResolvedValue({
      results: [{
        subjectCode: 'CS401', subjectName: 'DBMS', semester: 1,
        internalMarks: 35, externalMarks: 55, assignmentMarks: 9, labMarks: null,
        totalMarks: 99, totalMax: 110, percentage: 90, credits: 4,
        grade: 'S', gradePoints: 10,
      }],
      cgpa: { cgpa: 9.5, totalCredits: 4, earnedCredits: 4, totalSubjects: 1, semesters: [{ semester: 1, academicYear: '2025-26', gpa: 10, totalCredits: 4, earnedCredits: 4, subjectCount: 1 }] },
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
    expect(result.summary.overallCgpa).toBe(9.5);
    expect(result.summary.todayClassCount).toBe(1);
    expect(result.status.hasAttendance).toBe(true);
    expect(result.status.hasFees).toBe(true);
    expect(result.status.hasSchedule).toBe(true);
    expect(result.status.hasResults).toBe(true);
    expect(result.status.hasDetailedResults).toBe(true);
    expect(result.status.hasParent).toBe(true);
  });

  it('returns hasData false for unknown studentId', async () => {
    vi.mocked(mockUserRepo.findByStudentId).mockResolvedValue(null);

    const result = await service.getStudentProfile('UNKNOWN');

    expect(result.hasData).toBe(false);
    expect(result.student.id).toBe('');
    expect(result.student.fullName).toBe('');
    expect(result.summary.attendancePercentage).toBe(0);
    expect(result.summary.pendingFeeAmount).toBe(0);
    expect(result.summary.cgpa).toBe(0);
    expect(result.summary.overallCgpa).toBe(0);
    expect(result.summary.todayClassCount).toBe(0);
    expect(result.status.hasAttendance).toBe(false);
    expect(result.status.hasFees).toBe(false);
    expect(result.status.hasSchedule).toBe(false);
    expect(result.status.hasResults).toBe(false);
    expect(result.status.hasParent).toBe(false);
  });

  it('returns parent null when no parent account exists', async () => {
    vi.mocked(mockUserRepo.findByStudentId).mockResolvedValue(mockUser);
    vi.mocked(mockUserRepo.findParentByStudentId).mockResolvedValue(null);

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
    vi.mocked(mockUserRepo.findByStudentId).mockResolvedValue(mockUser);
    vi.mocked(mockUserRepo.findParentByStudentId).mockResolvedValue(mockParent);

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
    vi.mocked(mockUserRepo.findByStudentId).mockResolvedValue(mockUser);
    vi.mocked(mockUserRepo.findParentByStudentId).mockResolvedValue(null);

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
    vi.mocked(mockUserRepo.findByStudentId).mockResolvedValue(mockUser);
    vi.mocked(mockUserRepo.findParentByStudentId).mockResolvedValue(null);

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
    vi.mocked(mockUserRepo.findByStudentId).mockResolvedValue(mockUser);
    vi.mocked(mockUserRepo.findParentByStudentId).mockResolvedValue(null);

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
    vi.mocked(mockUserRepo.findByStudentId).mockResolvedValue(mockUser);
    vi.mocked(mockUserRepo.findParentByStudentId).mockResolvedValue(null);

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

  it('computes currentSemester from detailed results', async () => {
    vi.mocked(mockUserRepo.findByStudentId).mockResolvedValue(mockUser);
    vi.mocked(mockUserRepo.findParentByStudentId).mockResolvedValue(null);

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
      results: [],
      cgpa: 0,
      hasData: false,
    });
    vi.mocked(mockDetailedResults.getByStudentId).mockResolvedValue({
      results: [],
      cgpa: {
        cgpa: 9.0,
        totalCredits: 20,
        earnedCredits: 20,
        totalSubjects: 5,
        semesters: [
          { semester: 1, academicYear: '2024-25', gpa: 9.0, totalCredits: 20, earnedCredits: 20, subjectCount: 5 },
          { semester: 2, academicYear: '2024-25', gpa: 9.0, totalCredits: 20, earnedCredits: 20, subjectCount: 5 },
          { semester: 3, academicYear: '2025-26', gpa: 9.0, totalCredits: 20, earnedCredits: 20, subjectCount: 5 },
        ],
      },
      hasData: true,
    });

    const result = await service.getStudentProfile('22CSE001');

    expect(result.currentSemester).toBe(3);
  });

  it('verifies all sub-services are called with correct arguments', async () => {
    vi.mocked(mockUserRepo.findByStudentId).mockResolvedValue(mockUser);
    vi.mocked(mockUserRepo.findParentByStudentId).mockResolvedValue(null);

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

    expect(mockUserRepo.findByStudentId).toHaveBeenCalledWith('22CSE001');
    expect(mockUserRepo.findParentByStudentId).toHaveBeenCalledWith('22CSE001');
    expect(mockAttendance.getByStudentId).toHaveBeenCalledWith('22CSE001');
    expect(mockFees.getByStudentId).toHaveBeenCalledWith('22CSE001');
    expect(mockSchedule.getByStudent).toHaveBeenCalledWith({
      department: 'CSE',
      year: 4,
      section: 'A',
    });
    expect(mockResults.getByStudentId).toHaveBeenCalledWith('22CSE001');
    expect(mockDetailedResults.getByStudentId).toHaveBeenCalledWith('22CSE001');
  });

  it('cross-checks status flags with hasData from each service', async () => {
    vi.mocked(mockUserRepo.findByStudentId).mockResolvedValue(mockUser);
    vi.mocked(mockUserRepo.findParentByStudentId).mockResolvedValue(null);

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