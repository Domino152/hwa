import type { SubjectRecord } from './types.js';

export interface ISubjectRepository {
  findById(id: string): Promise<SubjectRecord | null>;
  findByCode(code: string): Promise<SubjectRecord | null>;
  findByDepartment(department: string): Promise<SubjectRecord[]>;
  findByDepartmentAndSemester(department: string, semester: number): Promise<SubjectRecord[]>;
  create(subject: Omit<SubjectRecord, 'id'>): Promise<SubjectRecord>;
  update(id: string, data: Partial<Omit<SubjectRecord, 'id'>>): Promise<SubjectRecord | null>;
  delete(id: string): Promise<boolean>;
  search(query: string): Promise<SubjectRecord[]>;
}
