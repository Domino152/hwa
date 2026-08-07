import type { IStudentRepository, StudentFilter, PaginationOptions, PaginatedResult } from '../../repositories/student.repository.js';
import type { StudentRecord } from '../../repositories/types.js';
import { NotFoundError, ConflictError } from '../../shared/utils/errors.js';

export interface CreateStudentInput {
  userId: string;
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
  parentId?: string | null;
  whatsappNumber?: string | null;
  parentWhatsappNumber?: string | null;
  status?: 'active' | 'graduated' | 'suspended';
}

export interface UpdateStudentInput {
  rollNumber?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: Date;
  department?: string;
  program?: string;
  semester?: number;
  section?: string;
  batch?: string;
  advisor?: string;
  parentId?: string | null;
  whatsappNumber?: string | null;
  parentWhatsappNumber?: string | null;
  status?: 'active' | 'graduated' | 'suspended';
}

export class StudentService {
  constructor(private readonly repo: IStudentRepository) {}

  async getById(id: string): Promise<StudentRecord> {
    const student = await this.repo.findById(id);
    if (!student) {
      throw new NotFoundError('Student');
    }
    return student;
  }

  async getByStudentId(studentId: string): Promise<StudentRecord> {
    const student = await this.repo.findByStudentId(studentId);
    if (!student) {
      throw new NotFoundError('Student');
    }
    return student;
  }

  async getByRegisterNumber(registerNumber: string): Promise<StudentRecord> {
    const student = await this.repo.findByRegisterNumber(registerNumber);
    if (!student) {
      throw new NotFoundError('Student');
    }
    return student;
  }

  async getByUserId(userId: string): Promise<StudentRecord | null> {
    return this.repo.findByUserId(userId);
  }

  async list(filter: StudentFilter, pagination: PaginationOptions): Promise<PaginatedResult<StudentRecord>> {
    return this.repo.find(filter, pagination);
  }

  async getByDepartment(department: string): Promise<StudentRecord[]> {
    return this.repo.findByDepartment(department);
  }

  async getByClass(department: string, semester: number, section: string): Promise<StudentRecord[]> {
    return this.repo.findByClass(department, semester, section);
  }

  async create(input: CreateStudentInput): Promise<StudentRecord> {
    const existingByStudentId = await this.repo.findByStudentId(input.studentId);
    if (existingByStudentId) {
      throw new ConflictError(`Student with ID ${input.studentId} already exists`);
    }

    const existingByRegister = await this.repo.findByRegisterNumber(input.registerNumber);
    if (existingByRegister) {
      throw new ConflictError(`Student with register number ${input.registerNumber} already exists`);
    }

    return this.repo.create({
      ...input,
      parentId: input.parentId ?? null,
      whatsappNumber: input.whatsappNumber ?? null,
      parentWhatsappNumber: input.parentWhatsappNumber ?? null,
      status: input.status ?? 'active',
      isActive: true,
    });
  }

  async update(id: string, input: UpdateStudentInput): Promise<StudentRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Student');
    }

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new NotFoundError('Student');
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Student');
    }

    await this.repo.delete(id);
  }

  async count(filter: StudentFilter): Promise<number> {
    return this.repo.count(filter);
  }
}
