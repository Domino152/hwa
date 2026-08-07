import type { Request, Response } from 'express';
import { AttendanceService } from './attendance.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  getByStudentId = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const records = await this.attendanceService.getByStudentId(studentId);
    const overallTotal = records.reduce((sum, r) => sum + r.totalClasses, 0);
    const overallAttended = records.reduce((sum, r) => sum + r.attendedClasses, 0);
    const overallPercentage = overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : 0;

    sendSuccess(res, {
      studentId,
      records,
      summary: { totalClasses: overallTotal, attendedClasses: overallAttended, overallPercentage },
      hasData: records.length > 0,
    });
  };

  getByStudentAndSubject = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const subject = String(req.params.subject);
    const record = await this.attendanceService.getByStudentAndSubject(studentId, subject);
    sendSuccess(res, { record, hasData: !!record });
  };

  getByStudentAndSemester = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const records = await this.attendanceService.getByStudentAndSemester(studentId, semester, academicYear);
    sendSuccess(res, { studentId, records, hasData: records.length > 0 });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const record = await this.attendanceService.create(req.body);
    sendSuccess(res, record, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const subject = String(req.params.subject);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const record = await this.attendanceService.update(studentId, subject, semester, academicYear, req.body);
    sendSuccess(res, record);
  };

  bulkCreate = async (req: Request, res: Response): Promise<void> => {
    const count = await this.attendanceService.bulkCreate(req.body.records);
    sendSuccess(res, { created: count }, 201);
  };

  getDepartmentStats = async (req: Request, res: Response): Promise<void> => {
    const department = String(req.query.department);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const stats = await this.attendanceService.getDepartmentStats(department, semester, academicYear);
    sendSuccess(res, { department, semester, academicYear, stats });
  };
}
