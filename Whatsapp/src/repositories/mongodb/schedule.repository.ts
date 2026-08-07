import { Schedule } from '../../database/models/Schedule.js';
import type { IScheduleRepository } from '../schedule.repository.js';
import type { ScheduleRecord } from '../types.js';

function toRecord(doc: { department: string; year: number; section: string; dayOfWeek: string; timeSlot: string; subject: string; room: string; type: 'lecture' | 'lab' | 'tutorial' }): ScheduleRecord {
  return {
    department: doc.department,
    year: doc.year,
    section: doc.section,
    dayOfWeek: doc.dayOfWeek,
    timeSlot: doc.timeSlot,
    subject: doc.subject,
    room: doc.room,
    type: doc.type,
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
    }).sort({ timeSlot: 1 });

    return docs.map(toRecord);
  }

  async findByWeek(department: string, year: number, section: string): Promise<ScheduleRecord[]> {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const docs = await Schedule.find({
      department,
      year,
      section,
      dayOfWeek: { $in: days },
    }).sort({ dayOfWeek: 1, timeSlot: 1 });

    return docs.map(toRecord);
  }

  async upsertSchedule(record: ScheduleRecord): Promise<ScheduleRecord> {
    const doc = await Schedule.findOneAndUpdate(
      {
        department: record.department,
        year: record.year,
        section: record.section,
        dayOfWeek: record.dayOfWeek,
        timeSlot: record.timeSlot,
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
}
