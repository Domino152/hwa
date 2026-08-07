import type { IResultRepository } from '../../repositories/result.repository.js';

export class ResultService {
  constructor(private readonly repo: IResultRepository) {}

  async getByStudentId(studentId: string) {
    return this.repo.findStudentResults(studentId);
  }

  async getByStudentAndSemester(studentId: string, semester: number, academicYear: string) {
    return this.repo.findByStudentAndSemester(studentId, semester, academicYear);
  }

  async getByExamType(studentId: string, examType: string, academicYear: string) {
    return this.repo.findByExamType(studentId, examType, academicYear);
  }

  async create(result: Parameters<IResultRepository['upsertResult']>[0]) {
    return this.repo.upsertResult(result);
  }

  async bulkCreate(results: Parameters<IResultRepository['upsertMany']>[0]) {
    return this.repo.upsertMany(results);
  }

  async getDepartmentResults(department: string, semester: number, academicYear: string) {
    return this.repo.getDepartmentResults(department, semester, academicYear);
  }

  async getCgpa(studentId: string): Promise<number> {
    const results = await this.repo.findStudentResults(studentId);
    if (results.length === 0) return 0;
    return results[0]?.cgpa ?? 0;
  }
}
