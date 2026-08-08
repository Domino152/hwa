import { Result, type IResult } from '../../database/models/Result.js';
import type { IResultRepository } from '../result.repository.js';
import type { ResultRecord } from '../types.js';

function toRecord(doc: IResult): ResultRecord {
  return {
    studentId: doc.studentId,
    semester: doc.semester,
    subject: doc.subjectCode,
    marksObtained: doc.totalMarks,
    totalMarks: doc.totalMax,
    grade: doc.grade,
    cgpa: doc.cgpa ?? 0,
  };
}

export class MongoResultRepository implements IResultRepository {
  async findStudentResults(studentId: string): Promise<ResultRecord[]> {
    const docs = await Result.find({ studentId }).sort({ subjectCode: 1 });
    return docs.map(toRecord);
  }

  async findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<ResultRecord[]> {
    const docs = await Result.find({ studentId, semester, academicYear }).sort({ subjectCode: 1 });
    return docs.map(toRecord);
  }

  async findByExamType(studentId: string, examType: string, academicYear: string): Promise<ResultRecord[]> {
    const docs = await Result.find({ studentId, examType, academicYear }).sort({ subjectCode: 1 });
    return docs.map(toRecord);
  }

  async upsertResult(record: ResultRecord & { examType: string; academicYear: string }): Promise<ResultRecord> {
    const doc = await Result.findOneAndUpdate(
      { studentId: record.studentId, subjectCode: record.subject, semester: record.semester, examType: record.examType, academicYear: record.academicYear },
      { $set: {
        studentId: record.studentId,
        subjectCode: record.subject,
        totalMarks: record.marksObtained,
        totalMax: record.totalMarks,
        grade: record.grade,
        cgpa: record.cgpa,
        semester: record.semester,
        examType: record.examType,
        academicYear: record.academicYear,
      } },
      { new: true, upsert: true },
    );
    return toRecord(doc);
  }

  async upsertMany(records: (ResultRecord & { examType: string; academicYear: string })[]): Promise<number> {
    let count = 0;
    for (const record of records) {
      await this.upsertResult(record);
      count++;
    }
    return count;
  }

  async getDepartmentResults(department: string, semester: number, academicYear: string): Promise<Array<{ subject: string; averageMarks: number; averageCgpa: number; totalStudents: number }>> {
    const results = await Result.aggregate([
      { $match: { semester, academicYear } },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: 'studentId',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      { $match: { 'student.department': department, 'student.isActive': true } },
      {
        $group: {
          _id: '$subject',
          averageMarks: { $avg: '$totalMarks' },
          averageCgpa: { $avg: '$cgpa' },
          totalStudents: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return results.map((r) => ({
      subject: r._id as string,
      averageMarks: Math.round(r.averageMarks as number),
      averageCgpa: Number((r.averageCgpa as number).toFixed(2)),
      totalStudents: r.totalStudents as number,
    }));
  }
}
