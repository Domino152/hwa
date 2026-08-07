import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolExecutor } from '../../src/chatbot/tools/tool-executor.js';
import type { IntegrationService } from '../../src/integration/integration.service.js';

function createMockIntegration(): IntegrationService {
  return {
    attendance: {
      getByStudentId: vi.fn(),
    },
    fees: {
      getByStudentId: vi.fn(),
    },
    schedule: {
      getByStudent: vi.fn(),
    },
    results: {
      getByStudentId: vi.fn(),
    },
    detailedResults: {} as never,
    publicInformation: {
      getByCategory: vi.fn(),
      search: vi.fn(),
    },
    profile: {} as never,
    students: {
      getByStudentId: vi.fn(),
    },
    findUserByPhone: vi.fn(),
    getStudentProfile: vi.fn(),
  } as unknown as IntegrationService;
}

describe('ToolExecutor', () => {
  let executor: ToolExecutor;
  let mockIntegration: IntegrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntegration = createMockIntegration();
    executor = new ToolExecutor(mockIntegration);
  });

  describe('get_attendance', () => {
    it('returns attendance records for a student', async () => {
      vi.mocked(mockIntegration.attendance.getByStudentId).mockResolvedValue({
        hasData: true,
        overallPercentage: 85,
        records: [
          { subject: 'DBMS', percentage: 90, attendedClasses: 18, totalClasses: 20 },
          { subject: 'Java', percentage: 80, attendedClasses: 16, totalClasses: 20 },
        ],
      });

      const result = await executor.execute('get_attendance', { studentId: '22CSE001' });

      expect(result.success).toBe(true);
      const data = result.data as { hasData: boolean; overallPercentage: number; subjects: Array<{ subject: string }> };
      expect(data.hasData).toBe(true);
      expect(data.overallPercentage).toBe(85);
      expect(data.subjects).toHaveLength(2);
      expect(data.subjects[0].subject).toBe('DBMS');
    });

    it('filters by subject when provided', async () => {
      vi.mocked(mockIntegration.attendance.getByStudentId).mockResolvedValue({
        hasData: true,
        overallPercentage: 85,
        records: [
          { subject: 'DBMS', percentage: 90, attendedClasses: 18, totalClasses: 20 },
          { subject: 'Java', percentage: 80, attendedClasses: 16, totalClasses: 20 },
        ],
      });

      const result = await executor.execute('get_attendance', { studentId: '22CSE001', subject: 'DBMS' });

      expect(result.success).toBe(true);
      const data = result.data as { subjects: Array<{ subject: string }> };
      expect(data.subjects).toHaveLength(1);
      expect(data.subjects[0].subject).toBe('DBMS');
    });

    it('returns hasData false when no records', async () => {
      vi.mocked(mockIntegration.attendance.getByStudentId).mockResolvedValue({
        hasData: false,
        overallPercentage: 0,
        records: [],
      });

      const result = await executor.execute('get_attendance', { studentId: '22CSE001' });

      expect(result.success).toBe(true);
      const data = result.data as { hasData: boolean };
      expect(data.hasData).toBe(false);
    });

    it('fails when studentId is missing', async () => {
      const result = await executor.execute('get_attendance', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('studentId is required');
    });
  });

  describe('get_fees', () => {
    it('returns fee details for a student', async () => {
      vi.mocked(mockIntegration.fees.getByStudentId).mockResolvedValue({
        hasData: true,
        fee: {
          totalFee: 100000,
          paidAmount: 50000,
          remainingAmount: 50000,
          dueDate: new Date('2026-09-01'),
          feeType: 'tuition',
          status: 'partial',
        },
      });

      const result = await executor.execute('get_fees', { studentId: '22CSE001' });

      expect(result.success).toBe(true);
      const data = result.data as { hasData: boolean; totalFee: number; status: string };
      expect(data.hasData).toBe(true);
      expect(data.totalFee).toBe(100000);
      expect(data.status).toBe('partial');
    });

    it('returns hasData false when no fees', async () => {
      vi.mocked(mockIntegration.fees.getByStudentId).mockResolvedValue({
        hasData: false,
        fee: null,
      });

      const result = await executor.execute('get_fees', { studentId: '22CSE001' });

      expect(result.success).toBe(true);
      const data = result.data as { hasData: boolean };
      expect(data.hasData).toBe(false);
    });
  });

  describe('get_schedule', () => {
    it('returns schedule with student department and year', async () => {
      vi.mocked(mockIntegration.students.getByStudentId).mockResolvedValue({
        id: 's1',
        department: 'CSE',
        semester: 5,
        section: 'A',
      } as never);

      vi.mocked(mockIntegration.schedule.getByStudent).mockResolvedValue({
        hasData: true,
        dayOfWeek: 'Monday',
        entries: [
          { timeSlot: '9:00 AM', subject: 'DBMS', room: '101', type: 'lecture' },
          { timeSlot: '10:00 AM', subject: 'Java Lab', room: 'Lab 2', type: 'lab' },
        ],
      });

      const result = await executor.execute('get_schedule', { studentId: '22CSE001' });

      expect(result.success).toBe(true);
      const data = result.data as { dayOfWeek: string; entries: Array<{ subject: string }> };
      expect(data.dayOfWeek).toBe('Monday');
      expect(data.entries).toHaveLength(2);
    });

    it('parses date expression', async () => {
      vi.mocked(mockIntegration.students.getByStudentId).mockResolvedValue(null);
      vi.mocked(mockIntegration.schedule.getByStudent).mockResolvedValue({
        hasData: true,
        dayOfWeek: 'Tuesday',
        entries: [],
      });

      const result = await executor.execute('get_schedule', { studentId: '22CSE001', dateExpression: 'tomorrow' });

      expect(result.success).toBe(true);
      const data = result.data as { dateLabel: string };
      expect(data.dateLabel).toBe('Tomorrow');
    });
  });

  describe('get_results', () => {
    it('returns results with CGPA', async () => {
      vi.mocked(mockIntegration.results.getByStudentId).mockResolvedValue({
        hasData: true,
        cgpa: 8.5,
        results: [
          { subject: 'DBMS', grade: 'A+', marksObtained: 85, totalMarks: 100 },
          { subject: 'Java', grade: 'A', marksObtained: 75, totalMarks: 100 },
        ],
      });

      const result = await executor.execute('get_results', { studentId: '22CSE001' });

      expect(result.success).toBe(true);
      const data = result.data as { cgpa: number; subjects: Array<{ subject: string }> };
      expect(data.cgpa).toBe(8.5);
      expect(data.subjects).toHaveLength(2);
    });
  });

  describe('get_profile', () => {
    it('returns student profile', async () => {
      vi.mocked(mockIntegration.getStudentProfile).mockResolvedValue({
        hasData: true,
        student: {
          fullName: 'John Doe',
          studentId: '22CSE001',
          department: 'CSE',
          year: 3,
          section: 'A',
        },
        summary: {} as never,
      } as never);

      const result = await executor.execute('get_profile', { studentId: '22CSE001' });

      expect(result.success).toBe(true);
      const data = result.data as { student: { fullName: string; studentId: string } };
      expect(data.student.fullName).toBe('John Doe');
      expect(data.student.studentId).toBe('22CSE001');
    });
  });

  describe('get_public_information', () => {
    it('returns content for a category', async () => {
      vi.mocked(mockIntegration.publicInformation.getByCategory).mockResolvedValue({
        hasData: true,
        category: 'hostel',
        entries: [{ title: 'Hostel Info', content: 'Hostel details...' }],
      });

      const result = await executor.execute('get_public_information', { category: 'hostel' });

      expect(result.success).toBe(true);
      const data = result.data as { category: string; entries: Array<{ title: string }> };
      expect(data.category).toBe('hostel');
      expect(data.entries).toHaveLength(1);
    });

    it('fails when category is missing', async () => {
      const result = await executor.execute('get_public_information', {});

      expect(result.success).toBe(false);
    });
  });

  describe('search_public_information', () => {
    it('searches by query', async () => {
      vi.mocked(mockIntegration.publicInformation.search).mockResolvedValue({
        hasData: true,
        category: 'about_hits',
        entries: [{ title: 'Campus', content: 'Campus info', category: 'about_hits' }],
      });

      const result = await executor.execute('search_public_information', { query: 'campus' });

      expect(result.success).toBe(true);
      const data = result.data as { entries: Array<{ title: string }> };
      expect(data.entries).toHaveLength(1);
    });
  });

  describe('get_announcements', () => {
    it('returns announcements for events category by default', async () => {
      vi.mocked(mockIntegration.publicInformation.getByCategory).mockResolvedValue({
        hasData: true,
        category: 'events',
        entries: [{ title: 'Tech Fest 2026', content: 'Annual tech fest', updatedAt: new Date() }],
      });

      const result = await executor.execute('get_announcements', {});

      expect(result.success).toBe(true);
      expect(mockIntegration.publicInformation.getByCategory).toHaveBeenCalledWith('events');
    });
  });

  describe('error handling', () => {
    it('returns error for unknown tool', async () => {
      const result = await executor.execute('unknown_tool' as never, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
    });

    it('catches errors thrown by integration', async () => {
      vi.mocked(mockIntegration.attendance.getByStudentId).mockRejectedValue(new Error('DB error'));

      const result = await executor.execute('get_attendance', { studentId: '22CSE001' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });
});