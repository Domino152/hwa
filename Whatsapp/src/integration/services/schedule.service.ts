import type { ScheduleService } from '../../modules/schedule/schedule.service.js';
import type { ScheduleResult } from '../types.js';

export class ScheduleIntegrationService {
  constructor(private readonly scheduleService: ScheduleService) {}

  async getByStudent(user: { department: string; year: number; section: string }): Promise<ScheduleResult> {
    const academicYear = `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`;

    const result = await this.scheduleService.getToday({
      department: user.department,
      year: user.year,
      section: user.section,
      academicYear,
    });

    return {
      entries: result.entries.map((e) => ({
        timeSlot: e.timeSlot,
        subject: e.subject,
        room: e.room,
        type: e.type,
      })),
      dayOfWeek: result.dayOfWeek,
      hasData: result.hasData,
    };
  }
}
