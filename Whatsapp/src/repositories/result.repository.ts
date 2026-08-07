import type { ResultRecord } from './types.js';

export interface IResultRepository {
  findStudentResults(studentId: string): Promise<ResultRecord[]>;
  findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<ResultRecord[]>;
  findByExamType(studentId: string, examType: string, academicYear: string): Promise<ResultRecord[]>;
  upsertResult(record: ResultRecord & { examType: string; academicYear: string }): Promise<ResultRecord>;
  upsertMany(records: (ResultRecord & { examType: string; academicYear: string })[]): Promise<number>;
  getDepartmentResults(department: string, semester: number, academicYear: string): Promise<Array<{ subject: string; averageMarks: number; averageCgpa: number; totalStudents: number }>>;
}
