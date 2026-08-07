import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DetailedResultService,
  computeGradeFromPercentage,
  computeTotals,
  GRADE_SCALE,
} from '../../src/modules/detailed-results/detailed-result.service.js';
import type { IDetailedResultRepository } from '../../src/repositories/detailed-result.repository.js';
import type { ISubjectRepository } from '../../src/repositories/subject.repository.js';
import type {
  DetailedResultRecord,
  SubjectRecord,
  SemesterGpaResult,
  CgpaResult,
} from '../../src/repositories/types.js';

function makeResult(overrides: Partial<DetailedResultRecord> = {}): DetailedResultRecord {
  return {
    studentId: '22CSE001',
    subjectCode: 'CS401',
    subjectName: 'DBMS',
    semester: 1,
    academicYear: '2025-26',
    internalMarks: 35,
    internalMax: 40,
    externalMarks: 55,
    externalMax: 60,
    assignmentMarks: 9,
    assignmentMax: 10,
    labMarks: null,
    labMax: 0,
    totalMarks: 99,
    totalMax: 110,
    percentage: 90,
    credits: 4,
    grade: 'O',
    gradePoints: 10,
    isPublished: false,
    isAbsent: false,
    remarks: null,
    ...overrides,
  };
}

function makeSubject(overrides: Partial<SubjectRecord> = {}): SubjectRecord {
  return {
    id: 'sub1',
    code: 'CS401',
    name: 'DBMS',
    department: 'CSE',
    semester: 1,
    credits: 4,
    type: 'theory',
    faculty: 'Dr. Smith',
    prerequisites: [],
    isActive: true,
    ...overrides,
  };
}

function createMockResultRepo(): IDetailedResultRepository {
  return {
    findByStudent: vi.fn().mockResolvedValue([]),
    findByStudentSemester: vi.fn().mockResolvedValue([]),
    findByStudentSubject: vi.fn().mockResolvedValue([]),
    findBySubject: vi.fn().mockResolvedValue([]),
    upsertResult: vi.fn().mockImplementation((r) => Promise.resolve(r)),
    upsertMany: vi.fn().mockResolvedValue(0),
    deleteResult: vi.fn().mockResolvedValue(0),
    getSemesterGpa: vi.fn().mockResolvedValue(null),
    getCgpa: vi.fn().mockResolvedValue({
      studentId: '22CSE001',
      cgpa: 0,
      totalCredits: 0,
      earnedCredits: 0,
      totalSubjects: 0,
      semesters: [],
    } as CgpaResult),
    getSubjectStats: vi.fn().mockResolvedValue(null),
    publishResults: vi.fn().mockResolvedValue(0),
  };
}

function createMockSubjectRepo(): ISubjectRepository {
  return {
    findByCode: vi.fn().mockImplementation((code: string) =>
      Promise.resolve(makeSubject({ code: code.toUpperCase() })),
    ),
    findAll: vi.fn().mockResolvedValue([]),
    findByDepartment: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue(makeSubject()),
    update: vi.fn().mockResolvedValue(makeSubject()),
    delete: vi.fn().mockResolvedValue(true),
    search: vi.fn().mockResolvedValue([]),
    findByFaculty: vi.fn().mockResolvedValue([]),
    findPrerequisites: vi.fn().mockResolvedValue([]),
    getScheduleForSubject: vi.fn().mockResolvedValue([]),
    getResultsForSubject: vi.fn().mockResolvedValue({ results: [], stats: null }),
  } as unknown as ISubjectRepository;
}

describe('computeGradeFromPercentage', () => {
  it('returns O for 90-100%', () => {
    expect(computeGradeFromPercentage(95).grade).toBe('O');
    expect(computeGradeFromPercentage(95).gradePoints).toBe(10);
    expect(computeGradeFromPercentage(90).grade).toBe('O');
  });

  it('returns A+ for 80-89.99%', () => {
    expect(computeGradeFromPercentage(85).grade).toBe('A+');
    expect(computeGradeFromPercentage(85).gradePoints).toBe(9);
  });

  it('returns A for 70-79.99%', () => {
    expect(computeGradeFromPercentage(75).grade).toBe('A');
    expect(computeGradeFromPercentage(75).gradePoints).toBe(8);
  });

  it('returns B+ for 60-69.99%', () => {
    expect(computeGradeFromPercentage(65).grade).toBe('B+');
    expect(computeGradeFromPercentage(65).gradePoints).toBe(7);
  });

  it('returns B for 50-59.99%', () => {
    expect(computeGradeFromPercentage(55).grade).toBe('B');
    expect(computeGradeFromPercentage(55).gradePoints).toBe(6);
  });

  it('returns C for 40-49.99%', () => {
    expect(computeGradeFromPercentage(45).grade).toBe('C');
    expect(computeGradeFromPercentage(45).gradePoints).toBe(5);
  });

  it('returns F for below 40%', () => {
    expect(computeGradeFromPercentage(30).grade).toBe('F');
    expect(computeGradeFromPercentage(30).gradePoints).toBe(0);
  });

  it('exports correct grade scale', () => {
    expect(GRADE_SCALE).toHaveLength(7);
  });
});

describe('computeTotals', () => {
  it('sums all marks components', () => {
    const totals = computeTotals({
      internalMarks: 35,
      internalMax: 40,
      externalMarks: 55,
      externalMax: 60,
      assignmentMarks: 9,
      assignmentMax: 10,
      labMarks: null,
      labMax: 0,
    });

    expect(totals.totalMarks).toBe(99);
    expect(totals.totalMax).toBe(110);
    expect(totals.percentage).toBe(90);
  });

  it('handles all null marks', () => {
    const totals = computeTotals({
      internalMarks: null,
      internalMax: 0,
      externalMarks: null,
      externalMax: 0,
      assignmentMarks: null,
      assignmentMax: 0,
      labMarks: null,
      labMax: 0,
    });

    expect(totals.totalMarks).toBe(0);
    expect(totals.totalMax).toBe(0);
    expect(totals.percentage).toBe(0);
  });

  it('includes lab marks', () => {
    const totals = computeTotals({
      internalMarks: null,
      internalMax: 0,
      externalMarks: null,
      externalMax: 0,
      assignmentMarks: null,
      assignmentMax: 0,
      labMarks: 45,
      labMax: 50,
    });

    expect(totals.totalMarks).toBe(45);
    expect(totals.totalMax).toBe(50);
    expect(totals.percentage).toBe(90);
  });
});

describe('DetailedResultService', () => {
  let repo: IDetailedResultRepository;
  let subjectRepo: ISubjectRepository;
  let service: DetailedResultService;

  beforeEach(() => {
    repo = createMockResultRepo();
    subjectRepo = createMockSubjectRepo();
    service = new DetailedResultService(repo, subjectRepo);
    vi.clearAllMocks();
  });

  describe('getByStudent', () => {
    it('returns all results for a student', async () => {
      const results = [makeResult(), makeResult({ subjectCode: 'CS402' })];
      vi.mocked(repo.findByStudent).mockResolvedValue(results);

      const out = await service.getByStudent('22CSE001');

      expect(out).toHaveLength(2);
      expect(repo.findByStudent).toHaveBeenCalledWith('22CSE001', undefined);
    });

    it('passes academicYear when provided', async () => {
      await service.getByStudent('22CSE001', '2025-26');
      expect(repo.findByStudent).toHaveBeenCalledWith('22CSE001', '2025-26');
    });
  });

  describe('getByStudentSemester', () => {
    it('returns results for a semester', async () => {
      const results = [makeResult()];
      vi.mocked(repo.findByStudentSemester).mockResolvedValue(results);

      const out = await service.getByStudentSemester('22CSE001', 1, '2025-26');

      expect(out).toHaveLength(1);
    });
  });

  describe('getByStudentSubject', () => {
    it('uppercases subject code', async () => {
      await service.getByStudentSubject('22CSE001', 'cs401', '2025-26');
      expect(repo.findByStudentSubject).toHaveBeenCalledWith('22CSE001', 'cs401', '2025-26');
    });
  });

  describe('create', () => {
    it('creates a detailed result with computed totals', async () => {
      const result = await service.create({
        studentId: '22CSE001',
        subjectCode: 'cs401',
        semester: 1,
        academicYear: '2025-26',
        internalMarks: 35,
        internalMax: 40,
        externalMarks: 55,
        externalMax: 60,
        assignmentMarks: 9,
        assignmentMax: 10,
      });

      expect(result.subjectCode).toBe('CS401');
      expect(result.totalMarks).toBe(99);
      expect(result.totalMax).toBe(110);
      expect(result.percentage).toBe(90);
      expect(result.grade).toBe('O');
      expect(result.gradePoints).toBe(10);
      expect(result.isPublished).toBe(false);
    });

    it('throws NotFoundError for unknown subject', async () => {
      vi.mocked(subjectRepo.findByCode).mockResolvedValue(null);

      await expect(
        service.create({
          studentId: '22CSE001',
          subjectCode: 'UNKNOWN',
          semester: 1,
          academicYear: '2025-26',
          internalMarks: 35,
        }),
      ).rejects.toThrow('Subject not found');
    });

    it('marks as Ab when isAbsent is true', async () => {
      const result = await service.create({
        studentId: '22CSE001',
        subjectCode: 'cs401',
        semester: 1,
        academicYear: '2025-26',
        isAbsent: true,
      });

      expect(result.grade).toBe('Ab');
      expect(result.gradePoints).toBe(0);
      expect(result.totalMarks).toBe(0);
    });

    it('uses subject credits when not provided', async () => {
      const result = await service.create({
        studentId: '22CSE001',
        subjectCode: 'cs401',
        semester: 1,
        academicYear: '2025-26',
        internalMarks: 35,
        internalMax: 40,
        externalMarks: 55,
        externalMax: 60,
      });

      expect(result.credits).toBe(4);
    });

    it('overrides credits when provided', async () => {
      const result = await service.create({
        studentId: '22CSE001',
        subjectCode: 'cs401',
        semester: 1,
        academicYear: '2025-26',
        internalMarks: 35,
        credits: 3,
      });

      expect(result.credits).toBe(3);
    });
  });

  describe('bulkCreate', () => {
    it('creates multiple results', async () => {
      vi.mocked(repo.upsertMany).mockResolvedValue(2);

      const result = await service.bulkCreate([
        {
          studentId: '22CSE001',
          subjectCode: 'CS401',
          semester: 1,
          academicYear: '2025-26',
          internalMarks: 35,
        },
        {
          studentId: '22CSE001',
          subjectCode: 'CS402',
          semester: 1,
          academicYear: '2025-26',
          internalMarks: 30,
        },
      ]);

      expect(result.created).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('counts failed entries when subject lookup fails', async () => {
      vi.mocked(subjectRepo.findByCode).mockImplementation((code: string) =>
        code.toUpperCase() === 'CS401' ? Promise.resolve(makeSubject({ code })) : Promise.resolve(null),
      );
      vi.mocked(repo.upsertMany).mockResolvedValue(1);

      const result = await service.bulkCreate([
        {
          studentId: '22CSE001',
          subjectCode: 'CS401',
          semester: 1,
          academicYear: '2025-26',
          internalMarks: 35,
        },
        {
          studentId: '22CSE001',
          subjectCode: 'INVALID',
          semester: 1,
          academicYear: '2025-26',
          internalMarks: 30,
        },
      ]);

      expect(result.failed).toBe(1);
      expect(result.created).toBe(1);
    });
  });

  describe('deleteResult', () => {
    it('deletes a result', async () => {
      vi.mocked(repo.deleteResult).mockResolvedValue(1);

      const deleted = await service.deleteResult('22CSE001', 'cs401', 1, '2025-26');

      expect(deleted).toBe(1);
      expect(repo.deleteResult).toHaveBeenCalledWith('22CSE001', 'cs401', 1, '2025-26');
    });

    it('throws NotFoundError when not found', async () => {
      vi.mocked(repo.deleteResult).mockResolvedValue(0);

      await expect(
        service.deleteResult('22CSE001', 'CS401', 1, '2025-26'),
      ).rejects.toThrow('Result not found');
    });
  });

  describe('getSemesterGpa', () => {
    it('returns semester GPA data', async () => {
      const gpa: SemesterGpaResult = {
        semester: 1,
        academicYear: '2025-26',
        gpa: 9.2,
        totalCredits: 20,
        earnedCredits: 20,
        subjectCount: 5,
        subjects: [],
      };
      vi.mocked(repo.getSemesterGpa).mockResolvedValue(gpa);

      const out = await service.getSemesterGpa('22CSE001', 1, '2025-26');

      expect(out?.gpa).toBe(9.2);
    });
  });

  describe('getCgpa', () => {
    it('returns cumulative GPA', async () => {
      const cgpa: CgpaResult = {
        studentId: '22CSE001',
        cgpa: 8.5,
        totalCredits: 80,
        earnedCredits: 75,
        totalSubjects: 20,
        semesters: [],
      };
      vi.mocked(repo.getCgpa).mockResolvedValue(cgpa);

      const out = await service.getCgpa('22CSE001');

      expect(out.cgpa).toBe(8.5);
    });
  });

  describe('getSubjectStats', () => {
    it('returns subject stats', async () => {
      vi.mocked(repo.getSubjectStats).mockResolvedValue({
        subjectCode: 'CS401',
        subjectName: 'DBMS',
        semester: 1,
        academicYear: '2025-26',
        studentCount: 50,
        averagePercentage: 78.5,
        highestPercentage: 98,
        lowestPercentage: 35,
        passCount: 42,
        failCount: 8,
        passPercentage: 84,
      });

      const stats = await service.getSubjectStats('cs401', 1, '2025-26');

      expect(stats?.studentCount).toBe(50);
      expect(stats?.passPercentage).toBe(84);
    });
  });

  describe('publishResults', () => {
    it('publishes unpublished results', async () => {
      vi.mocked(repo.findByStudentSemester).mockResolvedValue([makeResult()]);
      vi.mocked(repo.publishResults).mockResolvedValue(3);

      const count = await service.publishResults('22CSE001', 1, '2025-26');

      expect(count).toBe(3);
    });

    it('throws NotFoundError when no results exist', async () => {
      vi.mocked(repo.findByStudentSemester).mockResolvedValue([]);

      await expect(
        service.publishResults('22CSE001', 1, '2025-26'),
      ).rejects.toThrow('No results found');
    });
  });
});