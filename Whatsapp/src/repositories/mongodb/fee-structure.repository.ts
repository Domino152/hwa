import { FeeStructure } from '../../database/models/FeeStructure.js';
import type { FeeStructureRecord } from '../types.js';

interface IFeeStructureRepository {
  create(record: Omit<FeeStructureRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeeStructureRecord>;
  findByCode(code: string, academicYear: string): Promise<FeeStructureRecord | null>;
  findById(id: string): Promise<FeeStructureRecord | null>;
  findByDepartmentProgram(department: string, program: string, academicYear: string): Promise<FeeStructureRecord[]>;
  findByDepartmentSemester(department: string, semester: number, academicYear: string): Promise<FeeStructureRecord[]>;
  findAll(filter: { department?: string; academicYear?: string; isActive?: boolean }): Promise<FeeStructureRecord[]>;
  update(id: string, update: Partial<FeeStructureRecord>): Promise<FeeStructureRecord | null>;
  delete(id: string): Promise<boolean>;
}

function toRecord(doc: {
  _id: { toString(): string };
  code: string;
  name: string;
  category: string;
  amount: number;
  frequency: string;
  department: string;
  program: string;
  semester: number | null;
  year: number | null;
  academicYear: string;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}): FeeStructureRecord {
  return {
    id: doc._id.toString(),
    code: doc.code,
    name: doc.name,
    category: doc.category as FeeStructureRecord['category'],
    amount: doc.amount,
    frequency: doc.frequency as FeeStructureRecord['frequency'],
    department: doc.department,
    program: doc.program,
    semester: doc.semester,
    year: doc.year,
    academicYear: doc.academicYear,
    isActive: doc.isActive,
    description: doc.description,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoFeeStructureRepository implements IFeeStructureRepository {
  async create(record: Omit<FeeStructureRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeeStructureRecord> {
    const doc = await FeeStructure.create(record);
    return toRecord(doc);
  }

  async findByCode(code: string, academicYear: string): Promise<FeeStructureRecord | null> {
    const doc = await FeeStructure.findOne({ code, academicYear });
    return doc ? toRecord(doc) : null;
  }

  async findById(id: string): Promise<FeeStructureRecord | null> {
    const doc = await FeeStructure.findById(id);
    return doc ? toRecord(doc) : null;
  }

  async findByDepartmentProgram(department: string, program: string, academicYear: string): Promise<FeeStructureRecord[]> {
    const docs = await FeeStructure.find({ department, program, academicYear, isActive: true }).sort({ amount: -1 });
    return docs.map(toRecord);
  }

  async findByDepartmentSemester(department: string, semester: number, academicYear: string): Promise<FeeStructureRecord[]> {
    const docs = await FeeStructure.find({
      department,
      academicYear,
      isActive: true,
      $or: [{ semester }, { semester: null }],
    }).sort({ category: 1, amount: -1 });
    return docs.map(toRecord);
  }

  async findAll(filter: { department?: string; academicYear?: string; isActive?: boolean }): Promise<FeeStructureRecord[]> {
    const query: Record<string, unknown> = {};
    if (filter.department) query.department = filter.department;
    if (filter.academicYear) query.academicYear = filter.academicYear;
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    const docs = await FeeStructure.find(query).sort({ department: 1, code: 1 });
    return docs.map(toRecord);
  }

  async update(id: string, update: Partial<FeeStructureRecord>): Promise<FeeStructureRecord | null> {
    const doc = await FeeStructure.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true },
    );
    return doc ? toRecord(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await FeeStructure.findByIdAndDelete(id);
    return result !== null;
  }
}