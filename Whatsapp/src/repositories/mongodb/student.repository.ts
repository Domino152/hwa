import { Student } from '../../database/models/Student.js';
import type { IStudentRepository, StudentFilter, PaginationOptions, PaginatedResult } from '../student.repository.js';
import type { StudentRecord } from '../types.js';

function toStudentRecord(doc: {
  _id: unknown;
  userId: unknown;
  studentId: string;
  registerNumber: string;
  rollNumber: string;
  fullName: string;
  email: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: Date;
  department: string;
  program: string;
  semester: number;
  section: string;
  batch: string;
  advisor: string;
  parentId: unknown | null;
  whatsappNumber: string | null;
  parentWhatsappNumber: string | null;
  status: 'active' | 'graduated' | 'suspended';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): StudentRecord {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    studentId: doc.studentId,
    registerNumber: doc.registerNumber,
    rollNumber: doc.rollNumber,
    fullName: doc.fullName,
    email: doc.email,
    phone: doc.phone,
    gender: doc.gender,
    dateOfBirth: doc.dateOfBirth,
    department: doc.department,
    program: doc.program,
    semester: doc.semester,
    section: doc.section,
    batch: doc.batch,
    advisor: doc.advisor,
    parentId: doc.parentId ? String(doc.parentId) : null,
    whatsappNumber: doc.whatsappNumber,
    parentWhatsappNumber: doc.parentWhatsappNumber,
    status: doc.status,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function buildQuery(filter: StudentFilter) {
  const query: Record<string, unknown> = { isActive: true };

  if (filter.department) {
    query.department = filter.department;
  }

  if (filter.semester) {
    query.semester = filter.semester;
  }

  if (filter.section) {
    query.section = filter.section;
  }

  if (filter.status) {
    query.status = filter.status;
  }

  if (filter.program) {
    query.program = filter.program;
  }

  if (filter.batch) {
    query.batch = filter.batch;
  }

  if (filter.search) {
    const searchRegex = { $regex: filter.search, $options: 'i' };
    query.$or = [
      { fullName: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { studentId: searchRegex },
      { registerNumber: searchRegex },
    ];
  }

  return query;
}

export class MongoStudentRepository implements IStudentRepository {
  async findById(id: string): Promise<StudentRecord | null> {
    const doc = await Student.findById(id);
    return doc ? toStudentRecord(doc) : null;
  }

  async findByStudentId(studentId: string): Promise<StudentRecord | null> {
    const doc = await Student.findByStudentId(studentId);
    return doc ? toStudentRecord(doc) : null;
  }

  async findByRegisterNumber(registerNumber: string): Promise<StudentRecord | null> {
    const doc = await Student.findByRegisterNumber(registerNumber);
    return doc ? toStudentRecord(doc) : null;
  }

  async findByUserId(userId: string): Promise<StudentRecord | null> {
    const doc = await Student.findByUserId(userId);
    return doc ? toStudentRecord(doc) : null;
  }

  async find(filter: StudentFilter, pagination: PaginationOptions): Promise<PaginatedResult<StudentRecord>> {
    const query = buildQuery(filter);
    const skip = (pagination.page - 1) * pagination.limit;

    const [docs, total] = await Promise.all([
      Student.find(query).sort({ studentId: 1 }).skip(skip).limit(pagination.limit),
      Student.countDocuments(query),
    ]);

    return {
      data: docs.map(toStudentRecord),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async findByDepartment(department: string): Promise<StudentRecord[]> {
    const docs = await Student.find({ department, isActive: true }).sort({ studentId: 1 });
    return docs.map(toStudentRecord);
  }

  async findByClass(department: string, semester: number, section: string): Promise<StudentRecord[]> {
    const docs = await Student.find({ department, semester, section, isActive: true }).sort({ studentId: 1 });
    return docs.map(toStudentRecord);
  }

  async create(data: Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudentRecord> {
    const doc = await Student.create(data);
    return toStudentRecord(doc);
  }

  async update(id: string, data: Partial<StudentRecord>): Promise<StudentRecord | null> {
    const doc = await Student.findByIdAndUpdate(id, data, { new: true });
    return doc ? toStudentRecord(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const doc = await Student.findByIdAndUpdate(id, { isActive: false }, { new: true });
    return !!doc;
  }

  async count(filter: StudentFilter): Promise<number> {
    const query = buildQuery(filter);
    return Student.countDocuments(query);
  }
}
