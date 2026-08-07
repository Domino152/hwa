import type { IScheduleRepository } from '../../repositories/schedule.repository.js';

export class ScheduleService {
  constructor(private readonly repo: IScheduleRepository) {}

  async getByDay(department: string, year: number, section: string, dayOfWeek: string) {
    return this.repo.findScheduleByClass({ department, year, section, dayOfWeek });
  }

  async getByWeek(department: string, year: number, section: string) {
    const all = await this.repo.findByWeek(department, year, section);
    const grouped: Record<string, typeof all> = {};
    for (const entry of all) {
      if (!grouped[entry.dayOfWeek]) grouped[entry.dayOfWeek] = [];
      grouped[entry.dayOfWeek]!.push(entry);
    }
    return grouped;
  }

  async create(record: Parameters<IScheduleRepository['upsertSchedule']>[0]) {
    return this.repo.upsertSchedule(record);
  }

  async bulkCreate(records: Parameters<IScheduleRepository['upsertMany']>[0]) {
    return this.repo.upsertMany(records);
  }

  async deleteByDay(department: string, year: number, section: string, dayOfWeek: string) {
    return this.repo.deleteByParams({ department, year, section, dayOfWeek });
  }

  async getSubjectsByClass(department: string, year: number, section: string) {
    return this.repo.getSubjectsByClass(department, year, section);
  }
}
