import { Assignment } from '../../database/models/Assignment.js';
import type { AssignmentRecord, AssignmentStatus } from '../types.js';
import type { IAssignmentRepository } from '../assignment.repository.js';

function toRecord(doc: {
  _id: { toString(): string };
  title: string;
  description: string;
  subject: string;
  department: string;
  semester: number;
  academicYear: string;
  createdBy: string;
  facultyName: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  dueDate: Date;
  maxMarks: number;
  passingMarks: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): AssignmentRecord {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    subject: doc.subject,
    department: doc.department,
    semester: doc.semester,
    academicYear: doc.academicYear,
    createdBy: doc.createdBy,
    facultyName: doc.facultyName,
    attachmentUrl: doc.attachmentUrl,
    attachmentName: doc.attachmentName,
    dueDate: doc.dueDate,
    maxMarks: doc.maxMarks,
    passingMarks: doc.passingMarks,
    status: doc.status as AssignmentStatus,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoAssignmentRepository implements IAssignmentRepository {
  async create(record: Omit<AssignmentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssignmentRecord> {
    const doc = await Assignment.create(record);
    return toRecord(doc);
  }

  async findById(id: string): Promise<AssignmentRecord | null> {
    const doc = await Assignment.findById(id);
    return doc ? toRecord(doc) : null;
  }

  async findBySubject(subject: string, department: string, semester: number, academicYear: string): Promise<AssignmentRecord[]> {
    const docs = await Assignment.find({ subject, department, semester, academicYear }).sort({ dueDate: -1 });
    return docs.map(toRecord);
  }

  async findByFaculty(createdBy: string, status?: AssignmentStatus): Promise<AssignmentRecord[]> {
    const query: Record<string, unknown> = { createdBy };
    if (status) query.status = status;
    const docs = await Assignment.find(query).sort({ createdAt: -1 });
    return docs.map(toRecord);
  }

  async findPublished(department: string, semester: number, academicYear: string): Promise<AssignmentRecord[]> {
    const docs = await Assignment.find({ department, semester, academicYear, status: 'published' }).sort({ dueDate: 1 });
    return docs.map(toRecord);
  }

  async findOverdue(department: string, semester: number, academicYear: string): Promise<AssignmentRecord[]> {
    const docs = await Assignment.find({
      department,
      semester,
      academicYear,
      status: 'published',
      dueDate: { $lt: new Date() },
    }).sort({ dueDate: 1 });
    return docs.map(toRecord);
  }

  async update(id: string, update: Partial<AssignmentRecord>): Promise<AssignmentRecord | null> {
    const doc = await Assignment.findByIdAndUpdate(id, { $set: update }, { new: true });
    return doc ? toRecord(doc) : null;
  }

  async updateStatus(id: string, status: AssignmentStatus): Promise<AssignmentRecord | null> {
    const doc = await Assignment.findByIdAndUpdate(id, { $set: { status } }, { new: true });
    return doc ? toRecord(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Assignment.findByIdAndDelete(id);
    return result !== null;
  }
}