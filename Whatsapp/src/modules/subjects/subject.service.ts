import type { ISubjectRepository } from '../../repositories/subject.repository.js';
import type { SubjectRecord } from '../../repositories/types.js';
import { NotFoundError, ConflictError } from '../../shared/utils/errors.js';

export class SubjectService {
  constructor(private readonly repo: ISubjectRepository) {}

  async getById(id: string): Promise<SubjectRecord | null> {
    return this.repo.findById(id);
  }

  async getByCode(code: string): Promise<SubjectRecord | null> {
    return this.repo.findByCode(code);
  }

  async getByDepartment(department: string): Promise<SubjectRecord[]> {
    return this.repo.findByDepartment(department);
  }

  async getByDepartmentAndSemester(department: string, semester: number): Promise<SubjectRecord[]> {
    return this.repo.findByDepartmentAndSemester(department, semester);
  }

  async create(subject: Omit<SubjectRecord, 'id'>): Promise<SubjectRecord> {
    const existing = await this.repo.findByCode(subject.code);
    if (existing) throw new ConflictError(`Subject with code ${subject.code} already exists`);
    return this.repo.create(subject);
  }

  async update(id: string, data: Partial<Omit<SubjectRecord, 'id'>>): Promise<SubjectRecord> {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError('Subject');
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError('Subject');
    return true;
  }

  async search(query: string): Promise<SubjectRecord[]> {
    return this.repo.search(query);
  }
}
