import { Schedule, HolidayOverride } from '../../database/models/Schedule.js';
import type { IScheduleRepository } from '../schedule.repository.js';
import type { ScheduleRecord, HolidayOverrideRecord } from '../types.js';

function toRecord(doc: {
  department: string; year: number; section: string; dayOfWeek: string;
  periodNumber: number; timeSlot: string; subject: string; faculty: string;
  room: string; type: 'lecture' | 'lab' | 'tutorial'; semester: number; academicYear: string;
}): ScheduleRecord {
  return {
    department: doc.department,
    year: doc.year,
    section: doc.section,
    dayOfWeek: doc.dayOfWeek,
    periodNumber: doc.periodNumber,
    timeSlot: doc.timeSlot,
    subject: doc.subject,
    faculty: doc.faculty,
    room: doc.room,
    type: doc.type,
    semester: doc.semester,
    academicYear: doc.academicYear,
  };
}

function toHolidayRecord(doc: {
  _id: unknown; department: string; year: number; section: string;
  date: Date; reason: string; academicYear: string;
}): HolidayOverrideRecord {
  return {
    id: String(doc._id),
    department: doc.department,
    year: doc.year,
    section: doc.section,
    date: doc.date,
    reason: doc.reason,
    academicYear: doc.academicYear,
  };
}

export class MongoScheduleRepository implements IScheduleRepository {
  async findScheduleByClass(params: {
    department: string;
    year: number;
    section: string;
    dayOfWeek: string;
  }): Promise<ScheduleRecord[]> {
    const docs = await Schedule.find({
      department: params.department,
      year: params.year,
      section: params.section,
      dayOfWeek: params.dayOfWeek,
    }).sort({ periodNumber: 1 });

    return docs.map(toRecord);
  }

  async findByWeek(department: string, year: number, section: string): Promise<ScheduleRecord[]> {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const docs = await Schedule.find({
      department,
      year,
      section,
      dayOfWeek: { $in: days },
    }).sort({ dayOfWeek: 1, periodNumber: 1 });

    return docs.map(toRecord);
  }

  async upsertSchedule(record: ScheduleRecord): Promise<ScheduleRecord> {
    const doc = await Schedule.findOneAndUpdate(
      {
        department: record.department,
        year: record.year,
        section: record.section,
        dayOfWeek: record.dayOfWeek,
        periodNumber: record.periodNumber,
      },
      { $set: record },
      { new: true, upsert: true },
    );
    return toRecord(doc);
  }

  async upsertMany(records: ScheduleRecord[]): Promise<number> {
    let count = 0;
    for (const record of records) {
      await this.upsertSchedule(record);
      count++;
    }
    return count;
  }

  async deleteByParams(params: {
    department: string;
    year: number;
    section: string;
    dayOfWeek: string;
  }): Promise<number> {
    const result = await Schedule.deleteMany(params);
    return result.deletedCount;
  }

  async getSubjectsByClass(department: string, year: number, section: string): Promise<string[]> {
    const results = await Schedule.distinct('subject', { department, year, section });
    return results.sort();
  }

  async findByDepartmentSemester(
    department: string,
    semester: number,
    year: number,
    section: string,
  ): Promise<ScheduleRecord[]> {
    const docs = await Schedule.find({
      department,
      semester,
      year,
      section,
    }).sort({ dayOfWeek: 1, periodNumber: 1 });

    return docs.map(toRecord);
  }

  async findAllByClass(
    department: string,
    year: number,
    section: string,
    academicYear: string,
  ): Promise<ScheduleRecord[]> {
    const docs = await Schedule.find({
      department,
      year,
      section,
      academicYear,
    }).sort({ dayOfWeek: 1, periodNumber: 1 });

    return docs.map(toRecord);
  }

  async findHolidayOverrides(params: {
    department: string;
    year: number;
    section: string;
    academicYear: string;
  }): Promise<HolidayOverrideRecord[]> {
    const docs = await HolidayOverride.find({
      department: params.department,
      year: params.year,
      section: params.section,
      academicYear: params.academicYear,
    }).sort({ date: 1 });

    return docs.map(toHolidayRecord);
  }

  async isHoliday(
    date: Date,
    department: string,
    year: number,
    section: string,
    academicYear: string,
  ): Promise<HolidayOverrideRecord | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const doc = await HolidayOverride.findOne({
      department,
      year,
      section,
      academicYear,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    return doc ? toHolidayRecord(doc) : null;
  }

  async addHolidayOverride(record: HolidayOverrideRecord): Promise<HolidayOverrideRecord> {
    const doc = await HolidayOverride.findOneAndUpdate(
      {
        department: record.department,
        year: record.year,
        section: record.section,
        date: record.date,
        academicYear: record.academicYear,
      },
      { $set: record },
      { new: true, upsert: true },
    );
    return toHolidayRecord(doc);
  }

  async removeHolidayOverride(params: {
    department: string;
    year: number;
    section: string;
    date: Date;
    academicYear: string;
  }): Promise<number> {
    const startOfDay = new Date(params.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(params.date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await HolidayOverride.deleteMany({
      department: params.department,
      year: params.year,
      section: params.section,
      academicYear: params.academicYear,
      date: { $gte: startOfDay, $lte: endOfDay },
    });
    return result.deletedCount;
  }
}
