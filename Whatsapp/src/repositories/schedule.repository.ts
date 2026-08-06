import type { ScheduleRecord } from './types.js';

export interface IScheduleRepository {
  findScheduleByClass(params: {
    department: string;
    year: number;
    section: string;
    dayOfWeek: string;
  }): Promise<ScheduleRecord[]>;
}
