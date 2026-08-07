import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubjectService } from '../../src/modules/subjects/subject.service.js';
import type { ISubjectRepository } from '../../src/repositories/subject.repository.js';
import type { SubjectRecord } from '../../src/repositories/types.js';

function createMockRepo(): ISubjectRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByCode: vi.fn().mockResolvedValue(null),
    findByDepartment: vi.fn().mockResolvedValue([]),
    findByDepartmentAndSemester: vi.fn().mockResolvedValue([]),
    findByFaculty: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation((s: SubjectRecord) => Promise.resolve(s)),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(false),
    search: vi.fn().mockResolvedValue([]),
    findPrerequisites: vi.fn().mockResolvedValue([]),
    getScheduleForSubject: vi.fn().mockResolvedValue([]),
    getResultsForSubject: vi.fn().mockResolvedValue({
      subject: null, results: [], stats: { totalStudents: 0, averageMarks: 0, averagePercentage: 0, highestMarks: 0, lowestMarks: 0, passRate: 0 },
    }),
  };
}

const CS401: SubjectRecord = {
  id: 'id1', code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4,
  type: 'theory', faculty: 'Dr. Sharma', prerequisites: [], isActive: true,
};

const CS402: SubjectRecord = {
  id: 'id2', code: 'CS402', name: 'OS', department: 'CSE', semester: 7, credits: 4,
  type: 'theory', faculty: 'Dr. Patel', prerequisites: ['CS401'], isActive: true,
};

const CS301: SubjectRecord = {
  id: 'id3', code: 'CS301', name: 'DSA', department: 'CSE', semester: 5, credits: 4,
  type: 'theory', faculty: 'Dr. Singh', prerequisites: [], isActive: true,
};

describe('SubjectService', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let service: SubjectService;

  beforeEach(() => {
    repo = createMockRepo();
    service = new SubjectService(repo);
  });

  describe('getById', () => {
    it('returns subject by id', async () => {
      repo.findById.mockResolvedValue(CS401);
      const result = await service.getById('id1');
      expect(result).toEqual(CS401);
    });

    it('returns null when not found', async () => {
      const result = await service.getById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('getByCode', () => {
    it('returns subject by code', async () => {
      repo.findByCode.mockResolvedValue(CS401);
      const result = await service.getByCode('CS401');
      expect(result).toEqual(CS401);
    });
  });

  describe('getByFaculty', () => {
    it('returns subjects by faculty', async () => {
      repo.findByFaculty.mockResolvedValue([CS401]);
      const result = await service.getByFaculty('Dr. Sharma');
      expect(result).toHaveLength(1);
      expect(repo.findByFaculty).toHaveBeenCalledWith('Dr. Sharma');
    });
  });

  describe('create', () => {
    it('creates a subject', async () => {
      const input = { code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4, type: 'theory' as const, faculty: 'Dr. Sharma', prerequisites: [], isActive: true };
      const result = await service.create(input);
      expect(result.code).toBe('CS401');
      expect(repo.create).toHaveBeenCalled();
    });

    it('rejects duplicate code', async () => {
      repo.findByCode.mockResolvedValue(CS401);
      await expect(service.create({ ...CS401 })).rejects.toThrow('already exists');
    });

    it('validates prerequisites exist', async () => {
      repo.findByCode.mockResolvedValue(null);

      await expect(service.create({
        ...CS402, code: 'CS501', prerequisites: ['CS999'],
      })).rejects.toThrow('does not exist');
    });

    it('prevents self-referencing prerequisites', async () => {
      repo.findByCode.mockResolvedValue(null);
      await expect(service.create({
        ...CS401, prerequisites: ['CS401'],
      })).rejects.toThrow('cannot be its own prerequisite');
    });
  });

  describe('update', () => {
    it('updates a subject', async () => {
      repo.findById.mockResolvedValue(CS401);
      repo.update.mockResolvedValue({ ...CS401, name: 'Updated' });
      const result = await service.update('id1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundError when not found', async () => {
      repo.update.mockResolvedValue(null);
      await expect(service.update('unknown', { name: 'X' })).rejects.toThrow('Subject not found');
    });

    it('rejects duplicate code on update', async () => {
      repo.findByCode.mockResolvedValue(CS402);
      await expect(service.update('id1', { code: 'CS402' })).rejects.toThrow('already exists');
    });

    it('allows updating code to same value', async () => {
      repo.findByCode.mockResolvedValue(CS401);
      repo.update.mockResolvedValue(CS401);
      const result = await service.update('id1', { code: 'CS401' });
      expect(result.code).toBe('CS401');
    });
  });

  describe('delete', () => {
    it('deletes a subject', async () => {
      repo.delete.mockResolvedValue(true);
      await expect(service.delete('id1')).resolves.toBe(true);
    });

    it('throws NotFoundError when not found', async () => {
      repo.delete.mockResolvedValue(false);
      await expect(service.delete('unknown')).rejects.toThrow('Subject not found');
    });
  });

  describe('getPrerequisites', () => {
    it('returns prerequisites for a subject', async () => {
      repo.findPrerequisites.mockResolvedValue([CS301]);
      const result = await service.getPrerequisites('CS402');
      expect(result).toHaveLength(1);
      expect(repo.findPrerequisites).toHaveBeenCalledWith('CS402');
    });
  });

  describe('getScheduleForSubject', () => {
    it('returns subject with schedule', async () => {
      repo.findByCode.mockResolvedValue(CS401);
      repo.getScheduleForSubject.mockResolvedValue([
        { dayOfWeek: 'Monday', timeSlot: '09:00-10:00', room: '301', type: 'lecture', department: 'CSE', year: 4, section: 'A' },
      ]);

      const result = await service.getScheduleForSubject('CS401');
      expect(result.subject.code).toBe('CS401');
      expect(result.schedule).toHaveLength(1);
    });

    it('throws NotFoundError for unknown subject', async () => {
      repo.findByCode.mockResolvedValue(null);
      await expect(service.getScheduleForSubject('UNKNOWN')).rejects.toThrow('Subject not found');
    });
  });

  describe('getResultsForSubject', () => {
    it('returns results for a subject', async () => {
      repo.getResultsForSubject.mockResolvedValue({
        subject: CS401,
        results: [{ studentId: 'S1', semester: 7, marksObtained: 85, totalMarks: 100, grade: 'A', cgpa: 8.5, examType: 'final', academicYear: '2025-26' }],
        stats: { totalStudents: 1, averageMarks: 85, averagePercentage: 85, highestMarks: 85, lowestMarks: 85, passRate: 100 },
      });

      const result = await service.getResultsForSubject('CS401', 7, '2025-26');
      expect(result.results).toHaveLength(1);
      expect(result.stats.totalStudents).toBe(1);
    });
  });

  describe('validatePrerequisiteChain', () => {
    it('returns valid chain for subject with no prerequisites', async () => {
      repo.findByCode.mockResolvedValue(CS301);
      const result = await service.validatePrerequisiteChain('CS301');
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.chain).toContain('CS301');
    });

    it('returns valid chain for subject with valid prerequisites', async () => {
      repo.findByCode.mockImplementation(async (code: string) => {
        if (code === 'CS402') return CS402;
        if (code === 'CS401') return CS401;
        return null;
      });

      const result = await service.validatePrerequisiteChain('CS402');
      expect(result.valid).toBe(true);
      expect(result.chain).toContain('CS402');
      expect(result.chain).toContain('CS401');
    });

    it('returns invalid chain with missing prerequisites', async () => {
      repo.findByCode.mockImplementation(async (code: string) => {
        if (code === 'CS402') return CS402;
        if (code === 'CS401') return CS401;
        return null;
      });

      const brokenSubject: SubjectRecord = {
        ...CS402, code: 'CS501', prerequisites: ['CS402', 'MISSING'],
      };
      repo.findByCode.mockImplementation(async (code: string) => {
        if (code === 'CS501') return brokenSubject;
        if (code === 'CS402') return CS402;
        if (code === 'CS401') return CS401;
        return null;
      });

      const result = await service.validatePrerequisiteChain('CS501');
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('MISSING');
    });
  });
});
