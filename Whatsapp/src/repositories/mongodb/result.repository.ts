import { Result } from '../../database/models/Result.js';
import type { IResultRepository } from '../result.repository.js';
import type { ResultRecord } from '../types.js';

export class MongoResultRepository implements IResultRepository {
  async findStudentResults(studentId: string): Promise<ResultRecord[]> {
    const docs = await Result.find({ studentId }).sort({ subject: 1 });
    return docs.map((d) => ({
      studentId: d.studentId,
      semester: d.semester,
      subject: d.subject,
      marksObtained: d.marksObtained,
      totalMarks: d.totalMarks,
      grade: d.grade,
      cgpa: d.cgpa,
    }));
  }
}
