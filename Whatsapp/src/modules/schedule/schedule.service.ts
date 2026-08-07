import type { IScheduleRepository } from '../../repositories/schedule.repository.js';
import type { ScheduleRecord, HolidayOverrideRecord, CurrentClassResult, NextClassResult } from '../../repositories/types.js';
import { NotFoundError, AppError } from '../../shared/utils/errors.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function getISTDate(now?: Date): Date {
  const d = now ?? new Date();
  return new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

function getTodayName(now?: Date): string {
  return DAY_NAMES[getISTDate(now).getDay()] ?? 'Monday';
}

function getTomorrowName(now?: Date): string {
  const ist = getISTDate(now);
  return DAY_NAMES[(ist.getDay() + 1) % 7] ?? 'Tuesday';
}

function parseTimeSlot(timeSlot: string): { start: string; end: string } {
  const cleaned = timeSlot.replace(/\s+/g, '');
  const parts = cleaned.split('-');
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new AppError(`Invalid time slot format: ${timeSlot}`, 400, 'INVALID_TIME_SLOT');
  }
  return { start: parts[0], end: parts[1] };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h! * 60 + m!;
}

export interface ScheduleQueryParams {
  department: string;
  year: number;
  section: string;
  academicYear: string;
  semester?: number;
}

export interface HolidayInput {
  department: string;
  year: number;
  section: string;
  date: Date;
  reason: string;
  academicYear: string;
}

export class ScheduleService {
  constructor(private readonly repo: IScheduleRepository) {}

  async getByDay(params: ScheduleQueryParams, dayOfWeek: string): Promise<{
    entries: ScheduleRecord[];
    dayOfWeek: string;
    hasData: boolean;
  }> {
    const entries = await this.repo.findScheduleByClass({
      department: params.department,
      year: params.year,
      section: params.section,
      dayOfWeek,
    });
    return { entries, dayOfWeek, hasData: entries.length > 0 };
  }

  async getToday(params: ScheduleQueryParams, now?: Date): Promise<{
    entries: ScheduleRecord[];
    dayOfWeek: string;
    hasData: boolean;
    isHoliday: boolean;
    holidayReason: string | null;
  }> {
    const todayName = getTodayName(now);
    const today = getISTDate(now);

    const holiday = await this.repo.isHoliday(
      today,
      params.department,
      params.year,
      params.section,
      params.academicYear,
    );

    if (holiday) {
      return {
        entries: [],
        dayOfWeek: todayName,
        hasData: false,
        isHoliday: true,
        holidayReason: holiday.reason,
      };
    }

    const entries = await this.repo.findScheduleByClass({
      department: params.department,
      year: params.year,
      section: params.section,
      dayOfWeek: todayName,
    });

    return {
      entries,
      dayOfWeek: todayName,
      hasData: entries.length > 0,
      isHoliday: false,
      holidayReason: null,
    };
  }

  async getTomorrow(params: ScheduleQueryParams, now?: Date): Promise<{
    entries: ScheduleRecord[];
    dayOfWeek: string;
    hasData: boolean;
    isHoliday: boolean;
    holidayReason: string | null;
  }> {
    const tomorrowName = getTomorrowName(now);
    const ist = getISTDate(now);
    const tomorrow = new Date(ist);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const holiday = await this.repo.isHoliday(
      tomorrow,
      params.department,
      params.year,
      params.section,
      params.academicYear,
    );

    if (holiday) {
      return {
        entries: [],
        dayOfWeek: tomorrowName,
        hasData: false,
        isHoliday: true,
        holidayReason: holiday.reason,
      };
    }

    const entries = await this.repo.findScheduleByClass({
      department: params.department,
      year: params.year,
      section: params.section,
      dayOfWeek: tomorrowName,
    });

    return {
      entries,
      dayOfWeek: tomorrowName,
      hasData: entries.length > 0,
      isHoliday: false,
      holidayReason: null,
    };
  }

  async getWeekly(params: ScheduleQueryParams): Promise<{
    schedule: Record<string, ScheduleRecord[]>;
    hasData: boolean;
  }> {
    const all = await this.repo.findByWeek(
      params.department,
      params.year,
      params.section,
    );

    const grouped: Record<string, ScheduleRecord[]> = {};
    for (const entry of all) {
      if (!grouped[entry.dayOfWeek]) grouped[entry.dayOfWeek] = [];
      grouped[entry.dayOfWeek]!.push(entry);
    }

    return { schedule: grouped, hasData: Object.keys(grouped).length > 0 };
  }

  async getCurrentClass(params: ScheduleQueryParams, now?: Date): Promise<CurrentClassResult | null> {
    const todayName = getTodayName(now);
    const ist = getISTDate(now);
    const currentMinutes = ist.getHours() * 60 + ist.getMinutes();

    const holiday = await this.repo.isHoliday(
      ist,
      params.department,
      params.year,
      params.section,
      params.academicYear,
    );

    if (holiday) return null;

    const entries = await this.repo.findScheduleByClass({
      department: params.department,
      year: params.year,
      section: params.section,
      dayOfWeek: todayName,
    });

    for (const entry of entries) {
      const { start, end } = parseTimeSlot(entry.timeSlot);
      const startMin = timeToMinutes(start);
      const endMin = timeToMinutes(end);

      if (currentMinutes >= startMin && currentMinutes < endMin) {
        const startedAt = new Date(ist);
        startedAt.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

        const endsAt = new Date(ist);
        endsAt.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

        return {
          entry,
          startedAt,
          endsAt,
          elapsedMinutes: currentMinutes - startMin,
          remainingMinutes: endMin - currentMinutes,
        };
      }
    }

    return null;
  }

  async getNextClass(params: ScheduleQueryParams, now?: Date): Promise<NextClassResult | null> {
    const todayName = getTodayName(now);
    const ist = getISTDate(now);
    const currentMinutes = ist.getHours() * 60 + ist.getMinutes();

    const holiday = await this.repo.isHoliday(
      ist,
      params.department,
      params.year,
      params.section,
      params.academicYear,
    );

    if (holiday) return null;

    const entries = await this.repo.findScheduleByClass({
      department: params.department,
      year: params.year,
      section: params.section,
      dayOfWeek: todayName,
    });

    for (const entry of entries) {
      const { start } = parseTimeSlot(entry.timeSlot);
      const startMin = timeToMinutes(start);

      if (currentMinutes < startMin) {
        const startsAt = new Date(ist);
        startsAt.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

        return {
          entry,
          startsAt,
          waitMinutes: startMin - currentMinutes,
          isTomorrow: false,
        };
      }
    }

    const tomorrowName = getTomorrowName(now);
    const tomorrowEntries = await this.repo.findScheduleByClass({
      department: params.department,
      year: params.year,
      section: params.section,
      dayOfWeek: tomorrowName,
    });

    if (tomorrowEntries.length === 0) return null;

    const nextEntry = tomorrowEntries[0]!;
    const { start } = parseTimeSlot(nextEntry.timeSlot);
    const startMin = timeToMinutes(start);

    const tomorrow = new Date(ist);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startsAt = new Date(tomorrow);
    startsAt.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

    const endOfDay = new Date(ist);
    endOfDay.setHours(23, 59, 59, 999);
    const endMinToday = entries.length > 0
      ? timeToMinutes(parseTimeSlot(entries[entries.length - 1]!.timeSlot).end)
      : 0;
    const endOfSchoolDay = new Date(ist);
    endOfSchoolDay.setHours(Math.floor(endMinToday / 60), endMinToday % 60, 0, 0);

    const waitMinutes = Math.round((startsAt.getTime() - endOfSchoolDay.getTime()) / 60000);

    return {
      entry: nextEntry,
      startsAt,
      waitMinutes: Math.max(0, waitMinutes),
      isTomorrow: true,
    };
  }

  async create(record: ScheduleRecord): Promise<ScheduleRecord> {
    return this.repo.upsertSchedule(record);
  }

  async bulkCreate(records: ScheduleRecord[]): Promise<number> {
    return this.repo.upsertMany(records);
  }

  async deleteByDay(department: string, year: number, section: string, dayOfWeek: string): Promise<number> {
    return this.repo.deleteByParams({ department, year, section, dayOfWeek });
  }

  async getSubjectsByClass(department: string, year: number, section: string): Promise<string[]> {
    return this.repo.getSubjectsByClass(department, year, section);
  }

  async getHolidayOverrides(params: {
    department: string;
    year: number;
    section: string;
    academicYear: string;
  }): Promise<HolidayOverrideRecord[]> {
    return this.repo.findHolidayOverrides(params);
  }

  async addHolidayOverride(input: HolidayInput): Promise<HolidayOverrideRecord> {
    return this.repo.addHolidayOverride(input);
  }

  async removeHolidayOverride(params: {
    department: string;
    year: number;
    section: string;
    date: Date;
    academicYear: string;
  }): Promise<number> {
    const deleted = await this.repo.removeHolidayOverride(params);
    if (deleted === 0) {
      throw new NotFoundError('No holiday override found for the given date');
    }
    return deleted;
  }
}
