import type { IResultRepository } from '../../repositories/result.repository.js';
import type { ResultResult } from '../types.js';

export class ResultIntegrationService {
  constructor(private readonly repo: IResultRepository) {}

  async getByStudentId(studentId: string): Promise<ResultResult> {
    const results = await this.repo.findStudentResults(studentId);

    if (results.length === 0) {
      return { results: [], cgpa: 0, hasData: false };
    }

    return {
      results: results.map((r) => ({
        subject: r.subject,
        grade: r.grade,
        marksObtained: r.marksObtained,
        totalMarks: r.totalMarks,
      })),
      cgpa: results[0]?.cgpa ?? 0,
      hasData: true,
    };
  }
}
