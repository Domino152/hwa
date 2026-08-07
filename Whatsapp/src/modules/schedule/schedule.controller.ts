import type { Request, Response } from 'express';
import { ScheduleService, type ScheduleQueryParams } from './schedule.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

function extractParams(req: Request): ScheduleQueryParams {
  const { department, year, section, academicYear, semester } = req.query;
  return {
    department: department as string,
    year: Number(year),
    section: section as string,
    academicYear: (academicYear as string) || `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`,
    semester: semester ? Number(semester) : undefined,
  };
}

export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  getByDay = async (req: Request, res: Response): Promise<void> => {
    const params = extractParams(req);
    const dayOfWeek = req.params.dayOfWeek as string;
    const result = await this.scheduleService.getByDay(params, dayOfWeek);
    sendSuccess(res, result);
  };

  getToday = async (req: Request, res: Response): Promise<void> => {
    const params = extractParams(req);
    const result = await this.scheduleService.getToday(params);
    sendSuccess(res, result);
  };

  getTomorrow = async (req: Request, res: Response): Promise<void> => {
    const params = extractParams(req);
    const result = await this.scheduleService.getTomorrow(params);
    sendSuccess(res, result);
  };

  getWeekly = async (req: Request, res: Response): Promise<void> => {
    const params = extractParams(req);
    const result = await this.scheduleService.getWeekly(params);
    sendSuccess(res, result);
  };

  getCurrentClass = async (req: Request, res: Response): Promise<void> => {
    const params = extractParams(req);
    const result = await this.scheduleService.getCurrentClass(params);
    sendSuccess(res, {
      hasClass: result !== null,
      current: result,
    });
  };

  getNextClass = async (req: Request, res: Response): Promise<void> => {
    const params = extractParams(req);
    const result = await this.scheduleService.getNextClass(params);
    sendSuccess(res, {
      hasNext: result !== null,
      next: result,
    });
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
    const { department, year, section } = req.query;
    const dayOfWeek = req.params.dayOfWeek as string;
    const deleted = await this.scheduleService.deleteByDay(
      department as string,
      Number(year),
      section as string,
      dayOfWeek,
    );
    sendSuccess(res, { deleted });
  };

  getHolidayOverrides = async (req: Request, res: Response): Promise<void> => {
    const { department, year, section, academicYear } = req.query;
    const holidays = await this.scheduleService.getHolidayOverrides({
      department: department as string,
      year: Number(year),
      section: section as string,
      academicYear: academicYear as string,
    });
    sendSuccess(res, { holidays, count: holidays.length });
  };

  addHolidayOverride = async (req: Request, res: Response): Promise<void> => {
    const holiday = await this.scheduleService.addHolidayOverride(req.body);
    sendSuccess(res, holiday, 201);
  };

  removeHolidayOverride = async (req: Request, res: Response): Promise<void> => {
    const { department, year, section, date, academicYear } = req.body;
    const deleted = await this.scheduleService.removeHolidayOverride({
      department,
      year,
      section,
      date: new Date(date),
      academicYear,
    });
    sendSuccess(res, { deleted });
  };
}
