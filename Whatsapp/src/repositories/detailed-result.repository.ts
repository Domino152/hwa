import type {
  DetailedResultRecord,
  SemesterGpaResult,
  CgpaResult,
  SubjectResultStats,
} from './types.js';

export interface IDetailedResultRepository {
  findByStudent(studentId: string, academicYear?: string): Promise<DetailedResultRecord[]>;
  findByStudentSemester(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<DetailedResultRecord[]>;
  findByStudentSubject(
    studentId: string,
    subjectCode: string,
    academicYear: string,
  ): Promise<DetailedResultRecord[]>;
  findBySubject(
    subjectCode: string,
    semester: number,
    academicYear: string,
  ): Promise<DetailedResultRecord[]>;
  upsertResult(record: DetailedResultRecord): Promise<DetailedResultRecord>;
  upsertMany(records: DetailedResultRecord[]): Promise<number>;
  deleteResult(
    studentId: string,
    subjectCode: string,
    semester: number,
    academicYear: string,
  ): Promise<number>;
  getSemesterGpa(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<SemesterGpaResult | null>;
  getCgpa(studentId: string): Promise<CgpaResult>;
  getSubjectStats(
    subjectCode: string,
    semester: number,
    academicYear: string,
  ): Promise<SubjectResultStats | null>;
  publishResults(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<number>;
}