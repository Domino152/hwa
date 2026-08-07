import { Subject } from '../../database/models/Subject.js';
import type { ISubjectRepository } from '../subject.repository.js';
import type { SubjectRecord } from '../types.js';

function toRecord(doc: { _id: unknown; code: string; name: string; department: string; semester: number; credits: number; type: 'theory' | 'lab' | 'elective'; isActive: boolean }): SubjectRecord {
  return {
    id: String(doc._id),
    code: doc.code,
    name: doc.name,
    department: doc.department,
    semester: doc.semester,
    credits: doc.credits,
    type: doc.type,
    isActive: doc.isActive,
  };
}

export class MongoSubjectRepository implements ISubjectRepository {
  async findById(id: string): Promise<SubjectRecord | null> {
    const doc = await Subject.findById(id);
    return doc ? toRecord(doc) : null;
  }

  async findByCode(code: string): Promise<SubjectRecord | null> {
    const doc = await Subject.findOne({ code: code.toUpperCase() });
    return doc ? toRecord(doc) : null;
  }

  async findByDepartment(department: string): Promise<SubjectRecord[]> {
    const docs = await Subject.find({ department, isActive: true }).sort({ semester: 1, code: 1 });
    return docs.map(toRecord);
  }

  async findByDepartmentAndSemester(department: string, semester: number): Promise<SubjectRecord[]> {
    const docs = await Subject.find({ department, semester, isActive: true }).sort({ code: 1 });
    return docs.map(toRecord);
  }

  async create(subject: Omit<SubjectRecord, 'id'>): Promise<SubjectRecord> {
    const doc = await Subject.create(subject);
    return toRecord(doc);
  }

  async update(id: string, data: Partial<Omit<SubjectRecord, 'id'>>): Promise<SubjectRecord | null> {
    const doc = await Subject.findByIdAndUpdate(id, { $set: data }, { new: true });
    return doc ? toRecord(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Subject.findByIdAndDelete(id);
    return !!result;
  }

  async search(query: string): Promise<SubjectRecord[]> {
    const regex = new RegExp(query, 'i');
    const docs = await Subject.find({
      isActive: true,
      $or: [{ code: regex }, { name: regex }],
    }).sort({ code: 1 });
    return docs.map(toRecord);
  }
}
