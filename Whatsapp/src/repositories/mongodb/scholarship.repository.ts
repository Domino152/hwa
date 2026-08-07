import { Scholarship } from '../../database/models/Scholarship.js';
import type { ScholarshipRecord, ScholarshipType, ScholarshipStatus } from '../types.js';
import type { IScholarshipRepository } from '../fee.repository.js';

function toRecord(doc: {
  _id: { toString(): string };
  studentId: string;
  scholarshipName: string;
  type: string;
  amount: number;
  percentage: number | null;
  provider: string;
  validFrom: Date;
  validUntil: Date;
  semester: number | null;
  academicYear: string;
  status: string;
  appliedAmount: number;
  reason: string | null;
  approvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ScholarshipRecord {
  return {
    id: doc._id.toString(),
    studentId: doc.studentId,
    scholarshipName: doc.scholarshipName,
    type: doc.type as ScholarshipType,
    amount: doc.amount,
    percentage: doc.percentage,
    provider: doc.provider,
    validFrom: doc.validFrom,
    validUntil: doc.validUntil,
    semester: doc.semester,
    academicYear: doc.academicYear,
    status: doc.status as ScholarshipStatus,
    appliedAmount: doc.appliedAmount,
    reason: doc.reason,
    approvedBy: doc.approvedBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoScholarshipRepository implements IScholarshipRepository {
  async create(record: Omit<ScholarshipRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScholarshipRecord> {
    const doc = await Scholarship.create(record);
    return toRecord(doc);
  }

  async findById(id: string): Promise<ScholarshipRecord | null> {
    const doc = await Scholarship.findById(id);
    return doc ? toRecord(doc) : null;
  }

  async findByStudent(studentId: string, academicYear?: string): Promise<ScholarshipRecord[]> {
    const query: Record<string, unknown> = { studentId };
    if (academicYear) query.academicYear = academicYear;
    const docs = await Scholarship.find(query).sort({ createdAt: -1 });
    return docs.map(toRecord);
  }

  async findActiveByStudent(studentId: string, semester: number, academicYear: string): Promise<ScholarshipRecord[]> {
    const now = new Date();
    const docs = await Scholarship.find({
      studentId,
      academicYear,
      status: 'active',
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $or: [{ semester }, { semester: null }],
    }).sort({ amount: -1 });
    return docs.map(toRecord);
  }

  async update(id: string, update: Partial<ScholarshipRecord>): Promise<ScholarshipRecord | null> {
    const doc = await Scholarship.findByIdAndUpdate(id, { $set: update }, { new: true });
    return doc ? toRecord(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Scholarship.findByIdAndDelete(id);
    return result !== null;
  }

  async applyScholarship(id: string, amount: number): Promise<ScholarshipRecord | null> {
    const doc = await Scholarship.findByIdAndUpdate(
      id,
      { $inc: { appliedAmount: amount } },
      { new: true },
    );
    return doc ? toRecord(doc) : null;
  }

  async revokeScholarship(id: string, reason: string): Promise<ScholarshipRecord | null> {
    const doc = await Scholarship.findByIdAndUpdate(
      id,
      { $set: { status: 'revoked', reason } },
      { new: true },
    );
    return doc ? toRecord(doc) : null;
  }
}