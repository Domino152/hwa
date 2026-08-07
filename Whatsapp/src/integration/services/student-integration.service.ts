import type { IStudentRepository, StudentFilter, PaginationOptions, PaginatedResult } from '../../repositories/student.repository.js';
import type { StudentRecord } from '../../repositories/types.js';

export class StudentIntegrationService {
  constructor(private readonly studentRepo: IStudentRepository) {}

  async getById(id: string): Promise<StudentRecord | null> {
    return this.studentRepo.findById(id);
  }

  async getByStudentId(studentId: string): Promise<StudentRecord | null> {
    return this.studentRepo.findByStudentId(studentId);
  }

  async getByRegisterNumber(registerNumber: string): Promise<StudentRecord | null> {
    return this.studentRepo.findByRegisterNumber(registerNumber);
  }

  async getByUserId(userId: string): Promise<StudentRecord | null> {
    return this.studentRepo.findByUserId(userId);
  }

  async list(filter: StudentFilter, pagination: PaginationOptions): Promise<PaginatedResult<StudentRecord>> {
    return this.studentRepo.find(filter, pagination);
  }

  async getByDepartment(department: string): Promise<StudentRecord[]> {
    return this.studentRepo.findByDepartment(department);
  }

  async getByClass(department: string, semester: number, section: string): Promise<StudentRecord[]> {
    return this.studentRepo.findByClass(department, semester, section);
  }

  async create(data: Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudentRecord> {
    return this.studentRepo.create(data);
  }

  async update(id: string, data: Partial<StudentRecord>): Promise<StudentRecord | null> {
    return this.studentRepo.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.studentRepo.delete(id);
  }
}
