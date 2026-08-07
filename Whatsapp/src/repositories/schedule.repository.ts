import type { ScheduleRecord, HolidayOverrideRecord } from './types.js';

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
  findByDepartmentSemester(department: string, semester: number, year: number, section: string): Promise<ScheduleRecord[]>;
  findAllByClass(department: string, year: number, section: string, academicYear: string): Promise<ScheduleRecord[]>;
  findHolidayOverrides(params: {
    department: string;
    year: number;
    section: string;
    academicYear: string;
  }): Promise<HolidayOverrideRecord[]>;
  isHoliday(date: Date, department: string, year: number, section: string, academicYear: string): Promise<HolidayOverrideRecord | null>;
  addHolidayOverride(record: HolidayOverrideRecord): Promise<HolidayOverrideRecord>;
  removeHolidayOverride(params: {
    department: string;
    year: number;
    section: string;
    date: Date;
    academicYear: string;
  }): Promise<number>;
}
