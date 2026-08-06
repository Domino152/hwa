import { Schedule } from '../../database/models/Schedule.js';
import type { IScheduleRepository } from '../schedule.repository.js';
import type { ScheduleRecord } from '../types.js';

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

    return docs.map((d) => ({
      department: d.department,
      year: d.year,
      section: d.section,
      dayOfWeek: d.dayOfWeek,
      timeSlot: d.timeSlot,
      subject: d.subject,
      room: d.room,
      type: d.type,
    }));
  }
}
