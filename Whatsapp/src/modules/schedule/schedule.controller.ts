import type { Request, Response } from 'express';
import { ScheduleService } from './schedule.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  getByDay = async (req: Request, res: Response): Promise<void> => {
    const { department, year, section, dayOfWeek } = req.query;
    const entries = await this.scheduleService.getByDay(
      department as string,
      Number(year),
      section as string,
      dayOfWeek as string,
    );
    sendSuccess(res, { entries, dayOfWeek, hasData: entries.length > 0 });
  };

  getByWeek = async (req: Request, res: Response): Promise<void> => {
    const { department, year, section } = req.query;
    const schedule = await this.scheduleService.getByWeek(
      department as string,
      Number(year),
      section as string,
    );
    sendSuccess(res, { schedule, hasData: Object.keys(schedule).length > 0 });
  };

  getSubjects = async (req: Request, res: Response): Promise<void> => {
    const { department, year, section } = req.query;
    const subjects = await this.scheduleService.getSubjectsByClass(
      department as string,
      Number(year),
      section as string,
    );
    sendSuccess(res, { subjects });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const entry = await this.scheduleService.create(req.body);
    sendSuccess(res, entry, 201);
  };

  bulkCreate = async (req: Request, res: Response): Promise<void> => {
    const count = await this.scheduleService.bulkCreate(req.body.schedules);
    sendSuccess(res, { created: count }, 201);
  };

  deleteByDay = async (req: Request, res: Response): Promise<void> => {
    const { department, year, section, dayOfWeek } = req.query;
    const deleted = await this.scheduleService.deleteByDay(
      department as string,
      Number(year),
      section as string,
      dayOfWeek as string,
    );
    sendSuccess(res, { deleted });
  };
}
