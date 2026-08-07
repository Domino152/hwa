import type { ISubjectRepository, SubjectWithSchedule, SubjectWithResults } from '../../repositories/subject.repository.js';
import type { SubjectRecord } from '../../repositories/types.js';
import { NotFoundError, ConflictError, ValidationError } from '../../shared/utils/errors.js';

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

  async getByFaculty(faculty: string): Promise<SubjectRecord[]> {
    return this.repo.findByFaculty(faculty);
  }

  async create(subject: Omit<SubjectRecord, 'id'>): Promise<SubjectRecord> {
    const existing = await this.repo.findByCode(subject.code);
    if (existing) throw new ConflictError(`Subject with code ${subject.code} already exists`);

    if (subject.prerequisites?.length) {
      await this.validatePrerequisites(subject.prerequisites, subject.code);
    }

    return this.repo.create(subject);
  }

  async update(id: string, data: Partial<Omit<SubjectRecord, 'id'>>): Promise<SubjectRecord> {
    if (data.code) {
      const existing = await this.repo.findByCode(data.code);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Subject with code ${data.code} already exists`);
      }
    }

    if (data.prerequisites?.length) {
      const current = await this.repo.findById(id);
      await this.validatePrerequisites(data.prerequisites, current?.code ?? '');
    }

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

  async getPrerequisites(subjectCode: string): Promise<SubjectRecord[]> {
    return this.repo.findPrerequisites(subjectCode);
  }

  async getScheduleForSubject(subjectCode: string): Promise<SubjectWithSchedule> {
    const subject = await this.repo.findByCode(subjectCode);
    if (!subject) throw new NotFoundError('Subject');

    const schedule = await this.repo.getScheduleForSubject(subjectCode);
    return { subject, schedule };
  }

  async getResultsForSubject(subjectCode: string, semester: number, academicYear: string): Promise<SubjectWithResults> {
    return this.repo.getResultsForSubject(subjectCode, semester, academicYear);
  }

  async validatePrerequisiteChain(subjectCode: string): Promise<{ valid: boolean; missing: string[]; chain: string[] }> {
    const visited = new Set<string>();
    const missing: string[] = [];
    const chain: string[] = [];

    const dfs = async (code: string): Promise<boolean> => {
      if (visited.has(code)) return true;
      visited.add(code);

      const subject = await this.repo.findByCode(code);
      if (!subject) {
        missing.push(code);
        return false;
      }

      chain.push(code);

      if (!subject.prerequisites?.length) return true;

      let allValid = true;
      for (const prereq of subject.prerequisites) {
        const valid = await dfs(prereq);
        if (!valid) allValid = false;
      }

      return allValid;
    };

    const valid = await dfs(subjectCode);
    return { valid, missing, chain };
  }

  private async validatePrerequisites(prerequisites: string[], excludeCode: string): Promise<void> {
    for (const prereqCode of prerequisites) {
      if (prereqCode.toUpperCase() === excludeCode.toUpperCase()) {
        throw new ValidationError(`Subject ${prereqCode} cannot be its own prerequisite`);
      }

      const prereq = await this.repo.findByCode(prereqCode);
      if (!prereq) {
        throw new ValidationError(`Prerequisite subject ${prereqCode} does not exist`);
      }
    }
  }
}
