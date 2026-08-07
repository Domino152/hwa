import { AssignmentSubmission } from '../../database/models/AssignmentSubmission.js';
import type { AssignmentSubmissionRecord, SubmissionStatus } from '../types.js';
import type { IAssignmentSubmissionRepository } from '../assignment.repository.js';

function toRecord(doc: {
  _id: { toString(): string };
  assignmentId: { toString(): string };
  studentId: string;
  studentName: string;
  submissionDate: Date;
  isLate: boolean;
  latePenalty: number;
  fileUrl: string | null;
  fileName: string | null;
  status: string;
  marks: number | null;
  grade: string | null;
  feedback: string | null;
  gradedBy: string | null;
  gradedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AssignmentSubmissionRecord {
  return {
    id: doc._id.toString(),
    assignmentId: doc.assignmentId.toString(),
    studentId: doc.studentId,
    studentName: doc.studentName,
    submissionDate: doc.submissionDate,
    isLate: doc.isLate,
    latePenalty: doc.latePenalty,
    fileUrl: doc.fileUrl,
    fileName: doc.fileName,
    status: doc.status as SubmissionStatus,
    marks: doc.marks,
    grade: doc.grade,
    feedback: doc.feedback,
    gradedBy: doc.gradedBy,
    gradedAt: doc.gradedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoAssignmentSubmissionRepository implements IAssignmentSubmissionRepository {
  async create(record: Omit<AssignmentSubmissionRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssignmentSubmissionRecord> {
    const doc = await AssignmentSubmission.create(record);
    return toRecord(doc);
  }

  async findById(id: string): Promise<AssignmentSubmissionRecord | null> {
    const doc = await AssignmentSubmission.findById(id);
    return doc ? toRecord(doc) : null;
  }

  async findByAssignment(assignmentId: string): Promise<AssignmentSubmissionRecord[]> {
    const docs = await AssignmentSubmission.find({ assignmentId }).sort({ submissionDate: 1 });
    return docs.map(toRecord);
  }

  async findByStudent(studentId: string): Promise<AssignmentSubmissionRecord[]> {
    const docs = await AssignmentSubmission.find({ studentId }).sort({ createdAt: -1 });
    return docs.map(toRecord);
  }

  async findByStudentAssignment(assignmentId: string, studentId: string): Promise<AssignmentSubmissionRecord | null> {
    const doc = await AssignmentSubmission.findOne({ assignmentId, studentId });
    return doc ? toRecord(doc) : null;
  }

  async findByStudentSubject(studentId: string, subject: string): Promise<AssignmentSubmissionRecord[]> {
    const docs = await AssignmentSubmission.find({ studentId })
      .populate({ path: 'assignmentId', match: { subject }, select: 'subject title' })
      .sort({ createdAt: -1 });

    return docs.filter((d) => (d.assignmentId as unknown as { subject?: string })?.subject === subject).map(toRecord);
  }

  async update(id: string, update: Partial<Omit<AssignmentSubmissionRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AssignmentSubmissionRecord | null> {
    const doc = await AssignmentSubmission.findByIdAndUpdate(id, { $set: update }, { new: true });
    return doc ? toRecord(doc) : null;
  }

  async grade(id: string, marks: number, grade: string, feedback: string | null, gradedBy: string): Promise<AssignmentSubmissionRecord | null> {
    const doc = await AssignmentSubmission.findByIdAndUpdate(
      id,
      {
        $set: {
          marks,
          grade,
          feedback,
          gradedBy,
          gradedAt: new Date(),
          status: 'graded' as SubmissionStatus,
        },
      },
      { new: true },
    );
    return doc ? toRecord(doc) : null;
  }

  async returnSubmission(id: string): Promise<AssignmentSubmissionRecord | null> {
    const doc = await AssignmentSubmission.findByIdAndUpdate(
      id,
      { $set: { status: 'returned' as SubmissionStatus } },
      { new: true },
    );
    return doc ? toRecord(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await AssignmentSubmission.findByIdAndDelete(id);
    return result !== null;
  }

  async getSubmissionStats(assignmentId: string): Promise<{
    totalSubmissions: number;
    onTime: number;
    late: number;
    graded: number;
    ungraded: number;
    averageMarks: number;
    highestMarks: number;
    lowestMarks: number;
  }> {
    const results = await AssignmentSubmission.aggregate([
      { $match: { assignmentId: (await import('mongoose')).default.Types.ObjectId.createFromHexString(assignmentId) } },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          onTime: { $sum: { $cond: [{ $eq: ['$isLate', false] }, 1, 0] } },
          late: { $sum: { $cond: ['$isLate', 1, 0] } },
          graded: { $sum: { $cond: [{ $eq: ['$status', 'graded'] }, 1, 0] } },
          ungraded: { $sum: { $cond: [{ $ne: ['$status', 'graded'] }, 1, 0] } },
          avgMarks: { $avg: { $cond: [{ $ne: ['$marks', null] }, '$marks', undefined] } },
          maxMarks: { $max: { $cond: [{ $ne: ['$marks', null] }, '$marks', undefined] } },
          minMarks: { $min: { $cond: [{ $ne: ['$marks', null] }, '$marks', undefined] } },
        },
      },
    ]);

    if (results.length === 0) {
      return { totalSubmissions: 0, onTime: 0, late: 0, graded: 0, ungraded: 0, averageMarks: 0, highestMarks: 0, lowestMarks: 0 };
    }

    const r = results[0]!;
    return {
      totalSubmissions: r.totalSubmissions as number,
      onTime: r.onTime as number,
      late: r.late as number,
      graded: r.graded as number,
      ungraded: r.ungraded as number,
      averageMarks: Math.round(((r.avgMarks as number) ?? 0) * 100) / 100,
      highestMarks: (r.maxMarks as number) ?? 0,
      lowestMarks: (r.minMarks as number) ?? 0,
    };
  }
}