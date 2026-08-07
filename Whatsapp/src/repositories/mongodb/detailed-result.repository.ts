import { DetailedResult } from '../../database/models/DetailedResult.js';
import type { IDetailedResultRepository } from '../detailed-result.repository.js';
import type {
  DetailedResultRecord,
  SemesterGpaResult,
  CgpaResult,
  SubjectResultStats,
} from '../types.js';

function toRecord(doc: {
  _id: unknown;
  studentId: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  academicYear: string;
  internalMarks: number | null;
  internalMax: number;
  externalMarks: number | null;
  externalMax: number;
  assignmentMarks: number | null;
  assignmentMax: number;
  labMarks: number | null;
  labMax: number;
  totalMarks: number;
  totalMax: number;
  percentage: number;
  credits: number;
  grade: string;
  gradePoints: number;
  isPublished: boolean;
  isAbsent: boolean;
  remarks: string | null;
}): DetailedResultRecord {
  return {
    id: String(doc._id),
    studentId: doc.studentId,
    subjectCode: doc.subjectCode,
    subjectName: doc.subjectName,
    semester: doc.semester,
    academicYear: doc.academicYear,
    internalMarks: doc.internalMarks,
    internalMax: doc.internalMax,
    externalMarks: doc.externalMarks,
    externalMax: doc.externalMax,
    assignmentMarks: doc.assignmentMarks,
    assignmentMax: doc.assignmentMax,
    labMarks: doc.labMarks,
    labMax: doc.labMax,
    totalMarks: doc.totalMarks,
    totalMax: doc.totalMax,
    percentage: doc.percentage,
    credits: doc.credits,
    grade: doc.grade,
    gradePoints: doc.gradePoints,
    isPublished: doc.isPublished,
    isAbsent: doc.isAbsent,
    remarks: doc.remarks,
  };
}

export class MongoDetailedResultRepository implements IDetailedResultRepository {
  async findByStudent(studentId: string, academicYear?: string): Promise<DetailedResultRecord[]> {
    const query: Record<string, unknown> = { studentId };
    if (academicYear) query.academicYear = academicYear;

    const docs = await DetailedResult.find(query).sort({ semester: 1, subjectCode: 1 });
    return docs.map(toRecord);
  }

  async findByStudentSemester(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<DetailedResultRecord[]> {
    const docs = await DetailedResult.find({ studentId, semester, academicYear })
      .sort({ subjectCode: 1 });
    return docs.map(toRecord);
  }

  async findByStudentSubject(
    studentId: string,
    subjectCode: string,
    academicYear: string,
  ): Promise<DetailedResultRecord[]> {
    const docs = await DetailedResult.find({
      studentId,
      subjectCode: subjectCode.toUpperCase(),
      academicYear,
    }).sort({ semester: 1 });
    return docs.map(toRecord);
  }

  async findBySubject(
    subjectCode: string,
    semester: number,
    academicYear: string,
  ): Promise<DetailedResultRecord[]> {
    const docs = await DetailedResult.find({
      subjectCode: subjectCode.toUpperCase(),
      semester,
      academicYear,
    }).sort({ studentId: 1 });
    return docs.map(toRecord);
  }

  async upsertResult(record: DetailedResultRecord): Promise<DetailedResultRecord> {
    const doc = await DetailedResult.findOneAndUpdate(
      {
        studentId: record.studentId,
        subjectCode: record.subjectCode.toUpperCase(),
        semester: record.semester,
        academicYear: record.academicYear,
      },
      { $set: { ...record, subjectCode: record.subjectCode.toUpperCase() } },
      { new: true, upsert: true },
    );
    return toRecord(doc);
  }

  async upsertMany(records: DetailedResultRecord[]): Promise<number> {
    if (records.length === 0) return 0;

    const ops = records.map((record) => ({
      updateOne: {
        filter: {
          studentId: record.studentId,
          subjectCode: record.subjectCode.toUpperCase(),
          semester: record.semester,
          academicYear: record.academicYear,
        },
        update: {
          $set: { ...record, subjectCode: record.subjectCode.toUpperCase() },
        },
        upsert: true,
      },
    }));

    const result = await DetailedResult.bulkWrite(ops, { ordered: false });
    return (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);
  }

  async deleteResult(
    studentId: string,
    subjectCode: string,
    semester: number,
    academicYear: string,
  ): Promise<number> {
    const result = await DetailedResult.deleteOne({
      studentId,
      subjectCode: subjectCode.toUpperCase(),
      semester,
      academicYear,
    });
    return result.deletedCount ?? 0;
  }

  async getSemesterGpa(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<SemesterGpaResult | null> {
    const docs = await DetailedResult.find({ studentId, semester, academicYear })
      .sort({ subjectCode: 1 });

    if (docs.length === 0) return null;

    const subjects = docs.map((doc) => ({
      subjectCode: doc.subjectCode,
      subjectName: doc.subjectName,
      credits: doc.credits,
      totalMarks: doc.totalMarks,
      totalMax: doc.totalMax,
      percentage: doc.percentage,
      grade: doc.grade,
      gradePoints: doc.gradePoints,
    }));

    const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0);
    const earnedCredits = subjects
      .filter((s) => s.grade !== 'F' && s.grade !== 'Ab')
      .reduce((sum, s) => sum + s.credits, 0);

    const weightedPoints = subjects.reduce((sum, s) => sum + s.gradePoints * s.credits, 0);
    const gpa = totalCredits === 0 ? 0 : Number((weightedPoints / totalCredits).toFixed(2));

    return {
      semester,
      academicYear,
      gpa,
      totalCredits,
      earnedCredits,
      subjectCount: subjects.length,
      subjects,
    };
  }

  async getCgpa(studentId: string): Promise<CgpaResult> {
    const docs = await DetailedResult.find({ studentId }).sort({ semester: 1 });

    if (docs.length === 0) {
      return {
        studentId,
        cgpa: 0,
        totalCredits: 0,
        earnedCredits: 0,
        totalSubjects: 0,
        semesters: [],
      };
    }

    const semesterMap = new Map<string, SemesterGpaResult>();
    let overallWeighted = 0;
    let overallCredits = 0;
    let overallEarned = 0;

    for (const doc of docs) {
      const key = `${doc.semester}-${doc.academicYear}`;
      let entry = semesterMap.get(key);
      if (!entry) {
        entry = {
          semester: doc.semester,
          academicYear: doc.academicYear,
          gpa: 0,
          totalCredits: 0,
          earnedCredits: 0,
          subjectCount: 0,
          subjects: [],
        };
        semesterMap.set(key, entry);
      }

      const passed = doc.grade !== 'F' && doc.grade !== 'Ab';
      const subjectInfo = {
        subjectCode: doc.subjectCode,
        subjectName: doc.subjectName,
        credits: doc.credits,
        totalMarks: doc.totalMarks,
        totalMax: doc.totalMax,
        percentage: doc.percentage,
        grade: doc.grade,
        gradePoints: doc.gradePoints,
      };

      entry.subjects.push(subjectInfo);
      entry.totalCredits += doc.credits;
      entry.subjectCount += 1;
      if (passed) entry.earnedCredits += doc.credits;
      overallWeighted += doc.gradePoints * doc.credits;
      overallCredits += doc.credits;
      if (passed) overallEarned += doc.credits;
    }

    const semesters: SemesterGpaResult[] = [];
    for (const entry of semesterMap.values()) {
      const weighted = entry.subjects.reduce((sum, s) => sum + s.gradePoints * s.credits, 0);
      entry.gpa = entry.totalCredits === 0 ? 0 : Number((weighted / entry.totalCredits).toFixed(2));
      semesters.push(entry);
    }

    semesters.sort((a, b) => a.semester - b.semester);

    return {
      studentId,
      cgpa: overallCredits === 0 ? 0 : Number((overallWeighted / overallCredits).toFixed(2)),
      totalCredits: overallCredits,
      earnedCredits: overallEarned,
      totalSubjects: docs.length,
      semesters,
    };
  }

  async getSubjectStats(
    subjectCode: string,
    semester: number,
    academicYear: string,
  ): Promise<SubjectResultStats | null> {
    const docs = await DetailedResult.find({
      subjectCode: subjectCode.toUpperCase(),
      semester,
      academicYear,
    });

    if (docs.length === 0) return null;

    const percentages = docs.map((d) => d.percentage);
    const passed = docs.filter((d) => d.grade !== 'F' && d.grade !== 'Ab');
    const total = docs.length;
    const avgPct = percentages.reduce((s, p) => s + p, 0) / total;

    return {
      subjectCode: docs[0]!.subjectCode,
      subjectName: docs[0]!.subjectName,
      semester,
      academicYear,
      studentCount: total,
      averagePercentage: Number(avgPct.toFixed(2)),
      highestPercentage: Math.max(...percentages),
      lowestPercentage: Math.min(...percentages),
      passCount: passed.length,
      failCount: total - passed.length,
      passPercentage: Number(((passed.length / total) * 100).toFixed(2)),
    };
  }

  async publishResults(
    studentId: string,
    semester: number,
    academicYear: string,
  ): Promise<number> {
    const result = await DetailedResult.updateMany(
      { studentId, semester, academicYear, isPublished: false },
      { $set: { isPublished: true } },
    );
    return result.modifiedCount ?? 0;
  }
}