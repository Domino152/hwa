import type { IScheduleRepository } from '../../repositories/schedule.repository.js';
import type { ScheduleResult } from '../types.js';

const DAYS: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export class ScheduleIntegrationService {
  constructor(private readonly repo: IScheduleRepository) {}

  async getByStudent(user: { department: string; year: number; section: string }): Promise<ScheduleResult> {
    const today = DAYS[new Date().getDay()] ?? 'Monday';

    const entries = await this.repo.findScheduleByClass({
      department: user.department,
      year: user.year,
      section: user.section,
      dayOfWeek: today,
    });

    return {
      entries: entries.map((e) => ({
        timeSlot: e.timeSlot,
        subject: e.subject,
        room: e.room,
        type: e.type,
      })),
      dayOfWeek: today,
      hasData: entries.length > 0,
    };
  }
}
