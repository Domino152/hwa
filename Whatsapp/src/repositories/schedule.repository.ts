import type { ScheduleRecord } from './types.js';

export interface IScheduleRepository {
  findScheduleByClass(params: {
    department: string;
    year: number;
    section: string;
    dayOfWeek: string;
  }): Promise<ScheduleRecord[]>;
  findByWeek(department: string, year: number, section: string): Promise<ScheduleRecord[]>;
  upsertSchedule(record: ScheduleRecord): Promise<ScheduleRecord>;
  upsertMany(records: ScheduleRecord[]): Promise<number>;
  deleteByParams(params: {
    department: string;
    year: number;
    section: string;
    dayOfWeek: string;
  }): Promise<number>;
  getSubjectsByClass(department: string, year: number, section: string): Promise<string[]>;
}
