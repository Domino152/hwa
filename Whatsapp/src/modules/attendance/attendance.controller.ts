import type { Request, Response } from 'express';
import { AttendanceService } from './attendance.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/errors.js';
import {
  createAttendanceSchema,
  updateAttendanceSchema,
  dailyAttendanceSchema,
  bulkDailyAttendanceSchema,
} from './attendance.schemas.js';

export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // --- Aggregate endpoints (existing) ---

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
    const parsed = createAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.format());
    }
    const record = await this.attendanceService.create(parsed.data);
    sendSuccess(res, record, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.format());
    }
    const studentId = String(req.params.studentId);
    const subject = String(req.params.subject);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const record = await this.attendanceService.update(studentId, subject, semester, academicYear, parsed.data);
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

  // --- Daily Attendance ---

  markDaily = async (req: Request, res: Response): Promise<void> => {
    const parsed = dailyAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.format());
    }
    const record = await this.attendanceService.markDailyAttendance(parsed.data);
    sendSuccess(res, record, 201);
  };

  markBulkDaily = async (req: Request, res: Response): Promise<void> => {
    const parsed = bulkDailyAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.format());
    }
    const count = await this.attendanceService.markBulkDailyAttendance({ records: parsed.data.records });
    sendSuccess(res, { created: count }, 201);
  };

  getDailyByStudentAndDate = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const date = new Date(String(req.query.date));
    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid date parameter');
    }
    const records = await this.attendanceService.getDailyByStudentAndDate(studentId, date);
    sendSuccess(res, { studentId, date: date.toISOString().split('T')[0], records, hasData: records.length > 0 });
  };

  getDailyByStudentAndSubject = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const subject = String(req.params.subject);
    const startDate = new Date(String(req.query.startDate));
    const endDate = new Date(String(req.query.endDate));
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid date parameters');
    }
    const records = await this.attendanceService.getDailyByStudentAndSubject(studentId, subject, startDate, endDate);
    sendSuccess(res, { studentId, subject, records, hasData: records.length > 0 });
  };

  getDailyByStudentAndSemester = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const records = await this.attendanceService.getDailyByStudentAndSemester(studentId, semester, academicYear);
    sendSuccess(res, { studentId, records, total: records.length, hasData: records.length > 0 });
  };

  getDailyByDateRange = async (req: Request, res: Response): Promise<void> => {
    const startDate = new Date(String(req.query.startDate));
    const endDate = new Date(String(req.query.endDate));
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid date parameters');
    }
    const records = await this.attendanceService.getDailyByDateRange(startDate, endDate, semester, academicYear);
    sendSuccess(res, { records, total: records.length, hasData: records.length > 0 });
  };

  // --- Monthly Report ---

  getMonthlyReport = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const report = await this.attendanceService.getMonthlyReport(studentId, month, year, semester, academicYear);
    sendSuccess(res, report);
  };

  // --- Semester Report ---

  getSemesterReport = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const report = await this.attendanceService.getSemesterReport(studentId, semester, academicYear);
    sendSuccess(res, report);
  };

  // --- Analytics ---

  getAnalytics = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const analytics = await this.attendanceService.getAnalytics(studentId, semester, academicYear);
    sendSuccess(res, analytics);
  };

  // --- Summary ---

  getSummary = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const summary = await this.attendanceService.getSummary(studentId, semester, academicYear);
    sendSuccess(res, summary);
  };

  // --- Below-75% Detection ---

  getBelowThreshold = async (req: Request, res: Response): Promise<void> => {
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const threshold = req.query.threshold ? Number(req.query.threshold) : 75;
    const students = await this.attendanceService.getStudentsBelowThreshold(semester, academicYear, threshold);
    sendSuccess(res, { students, total: students.length, threshold });
  };

  detectAndAlert = async (req: Request, res: Response): Promise<void> => {
    const semester = Number(req.body.semester ?? req.query.semester);
    const academicYear = String(req.body.academicYear ?? req.query.academicYear);
    const alerts = await this.attendanceService.detectBelowThresholdAndAlert(semester, academicYear);
    sendSuccess(res, { alerts, total: alerts.length });
  };

  // --- History ---

  getHistory = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await this.attendanceService.getHistory(studentId, page, limit);
    sendSuccess(res, { ...result, page, limit });
  };

  // --- Faculty Lookup ---

  getFacultyMarkedRecords = async (req: Request, res: Response): Promise<void> => {
    const facultyId = String(req.params.facultyId);
    const date = new Date(String(req.query.date));
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid date parameter');
    }
    const records = await this.attendanceService.getFacultyMarkedRecords(facultyId, date, semester, academicYear);
    sendSuccess(res, { facultyId, date: date.toISOString().split('T')[0], records, total: records.length });
  };

  // --- Student Lookup ---

  lookupStudent = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);

    const [records, summary] = await Promise.all([
      this.attendanceService.getByStudentId(studentId),
      this.attendanceService.getSummary(studentId, semester, academicYear),
    ]);

    const overallTotal = records.reduce((sum, r) => sum + r.totalClasses, 0);
    const overallAttended = records.reduce((sum, r) => sum + r.attendedClasses, 0);
    const overallPercentage = overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : 0;

    sendSuccess(res, {
      studentId,
      records,
      summary,
      overall: { totalClasses: overallTotal, attendedClasses: overallAttended, overallPercentage },
      hasData: records.length > 0,
    });
  };
}
