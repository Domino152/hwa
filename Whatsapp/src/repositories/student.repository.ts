import type { StudentRecord } from './types.js';

export interface StudentFilter {
  department?: string;
  semester?: number;
  section?: string;
  status?: 'active' | 'graduated' | 'suspended';
  program?: string;
  batch?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IStudentRepository {
  findById(id: string): Promise<StudentRecord | null>;
  findByStudentId(studentId: string): Promise<StudentRecord | null>;
  findByRegisterNumber(registerNumber: string): Promise<StudentRecord | null>;
  findByUserId(userId: string): Promise<StudentRecord | null>;
  find(filter: StudentFilter, pagination: PaginationOptions): Promise<PaginatedResult<StudentRecord>>;
  findByDepartment(department: string): Promise<StudentRecord[]>;
  findByClass(department: string, semester: number, section: string): Promise<StudentRecord[]>;
  create(record: Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudentRecord>;
  update(id: string, data: Partial<StudentRecord>): Promise<StudentRecord | null>;
  delete(id: string): Promise<boolean>;
  count(filter: StudentFilter): Promise<number>;
}
