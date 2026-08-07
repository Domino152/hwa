import type { IDetailedResultRepository } from '../../repositories/detailed-result.repository.js';
import type { ISubjectRepository } from '../../repositories/subject.repository.js';
import type {
  DetailedResultRecord,
  SemesterGpaResult,
  CgpaResult,
  SubjectResultStats,
} from '../../repositories/types.js';
import { NotFoundError } from '../../shared/utils/errors.js';

export interface DetailedResultInput {
  studentId: string;
  subjectCode: string;
  semester: number;
  academicYear: string;
  internalMarks?: number | null;
  internalMax?: number;
  externalMarks?: number | null;
  externalMax?: number;
  assignmentMarks?: number | null;
  assignmentMax?: number;
  labMarks?: number | null;
  labMax?: number;
  credits?: number;
  isAbsent?: boolean;
  remarks?: string | null;
}

export const GRADE_SCALE: Array<{
  grade: string;
  min: number;
  max: number;
  points: number;
}> = [
  { grade: 'S', min: 90, max: 100, points: 10 },
  { grade: 'A+', min: 80, max: 89.99, points: 9 },
  { grade: 'A', min: 70, max: 79.99, points: 8 },
  { grade: 'B+', min: 60, max: 69.99, points: 7 },
  { grade: 'B', min: 50, max: 59.99, points: 6 },
  { grade: 'C', min: 40, max: 49.99, points: 5 },
  { grade: 'F', min: 0, max: 39.99, points: 0 },
];

export function computeGradeFromPercentage(percentage: number): { grade: string; gradePoints: number } {
  for (const tier of GRADE_SCALE) {
    if (percentage >= tier.min && percentage <= tier.max) {
      return { grade: tier.grade, gradePoints: tier.points };
    }
  }
  return { grade: 'F', gradePoints: 0 };
}

export function computeTotals(input: {
  internalMarks: number | null;
  internalMax: number;
  externalMarks: number | null;
  externalMax: number;
  assignmentMarks: number | null;
  assignmentMax: number;
  labMarks: number | null;
  labMax: number;
}): { totalMarks: number; totalMax: number; percentage: number } {
  const totalMarks =
    (input.internalMarks ?? 0) +
    (input.externalMarks ?? 0) +
    (input.assignmentMarks ?? 0) +
    (input.labMarks ?? 0);
  const totalMax =
    input.internalMax + input.externalMax + input.assignmentMax + input.labMax;

  const percentage = totalMax === 0 ? 0 : Number(((totalMarks / totalMax) * 100).toFixed(2));

  return { totalMarks, totalMax, percentage };
}

export class DetailedResultService {
  constructor(
    private readonly repo: IDetailedResultRepository,
    private readonly subjectRepo: ISubjectRepository,
  ) {}

  async getByStudent(studentId: string, academicYear?: string): Promise<DetailedResultRecord[]> {
    return this.repo.findByStudent(studentId, academicYear);
  }

  async getByStudentSemester(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<DetailedResultRecord[]> {
    return this.repo.findByStudentSemester(studentId, semester, academicYear);
  }

  async getByStudentSubject(
    studentId: string,
    subjectCode: string,
    academicYear: string,
  ): Promise<DetailedResultRecord[]> {
    return this.repo.findByStudentSubject(studentId, subjectCode, academicYear);
  }

  async getBySubject(
    subjectCode: string,
    semester: number,
    academicYear: string,
  ): Promise<DetailedResultRecord[]> {
    return this.repo.findBySubject(subjectCode, semester, academicYear);
  }

  async create(input: DetailedResultInput): Promise<DetailedResultRecord> {
    const subject = await this.subjectRepo.findByCode(input.subjectCode.toUpperCase());
    if (!subject) {
      throw new NotFoundError(`Subject not found: ${input.subjectCode}`);
    }

    const internalMarks = input.isAbsent ? null : (input.internalMarks ?? null);
    const externalMarks = input.isAbsent ? null : (input.externalMarks ?? null);
    const assignmentMarks = input.isAbsent ? null : (input.assignmentMarks ?? null);
    const labMarks = input.isAbsent ? null : (input.labMarks ?? null);

    const internalMax = internalMarks !== null ? (input.internalMax ?? 40) : 0;
    const externalMax = externalMarks !== null ? (input.externalMax ?? 60) : 0;
    const assignmentMax = assignmentMarks !== null ? (input.assignmentMax ?? 10) : 0;
    const labMax = labMarks !== null ? (input.labMax ?? 50) : 0;

    const totals = computeTotals({
      internalMarks,
      internalMax,
      externalMarks,
      externalMax,
      assignmentMarks,
      assignmentMax,
      labMarks,
      labMax,
    });

    const { grade, gradePoints } = input.isAbsent
      ? { grade: 'Ab', gradePoints: 0 }
      : computeGradeFromPercentage(totals.percentage);

    const credits = input.credits ?? subject.credits;

    const record: DetailedResultRecord = {
      studentId: input.studentId,
      subjectCode: subject.code,
      subjectName: subject.name,
      semester: input.semester,
      academicYear: input.academicYear,
      internalMarks,
      internalMax,
      externalMarks,
      externalMax,
      assignmentMarks,
      assignmentMax,
      labMarks,
      labMax,
      totalMarks: totals.totalMarks,
      totalMax: totals.totalMax,
      percentage: totals.percentage,
      credits,
      grade,
      gradePoints,
      isPublished: false,
      isAbsent: input.isAbsent ?? false,
      remarks: input.remarks ?? null,
    };

    return this.repo.upsertResult(record);
  }

  async bulkCreate(records: DetailedResultInput[]): Promise<{ created: number; failed: number }> {
    const fullRecords: DetailedResultRecord[] = [];
    let failed = 0;

    for (const input of records) {
      try {
        const full = await this.create(input);
        fullRecords.push(full);
      } catch {
        failed += 1;
      }
    }

    const created = await this.repo.upsertMany(fullRecords);
    return { created, failed };
  }

  async deleteResult(
    studentId: string,
    subjectCode: string,
    semester: number,
    academicYear: string,
  ): Promise<number> {
    const deleted = await this.repo.deleteResult(
      studentId,
      subjectCode,
      semester,
      academicYear,
    );
    if (deleted === 0) {
      throw new NotFoundError(
        `Result not found for student ${studentId}, subject ${subjectCode}, semester ${semester}`,
      );
    }
    return deleted;
  }

  async getSemesterGpa(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<SemesterGpaResult | null> {
    return this.repo.getSemesterGpa(studentId, semester, academicYear);
  }

  async getCgpa(studentId: string): Promise<CgpaResult> {
    return this.repo.getCgpa(studentId);
  }

  async getSubjectStats(
    subjectCode: string,
    semester: number,
    academicYear: string,
  ): Promise<SubjectResultStats | null> {
    return this.repo.getSubjectStats(subjectCode, semester, academicYear);
  }

  async publishResults(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<number> {
    const existing = await this.repo.findByStudentSemester(studentId, semester, academicYear);
    if (existing.length === 0) {
      throw new NotFoundError(
        `No results found for student ${studentId}, semester ${semester}, ${academicYear}`,
      );
    }
    return this.repo.publishResults(studentId, semester, academicYear);
  }
}