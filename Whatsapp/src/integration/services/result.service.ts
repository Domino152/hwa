import { Result } from '../../database/models/Result.js';
import type { ResultResult } from '../types.js';

export class ResultIntegrationService {
  async getByStudentId(studentId: string): Promise<ResultResult> {
    const results = await Result.find({ studentId }).sort({ subject: 1 });

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
