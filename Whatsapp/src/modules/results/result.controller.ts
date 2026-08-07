import type { Request, Response } from 'express';
import { ResultService } from './result.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class ResultController {
  constructor(private readonly resultService: ResultService) {}

  getByStudentId = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const results = await this.resultService.getByStudentId(studentId);
    const cgpa = results.length > 0 ? results[0]!.cgpa : 0;
    sendSuccess(res, { studentId, results, cgpa, hasData: results.length > 0 });
  };

  getByStudentAndSemester = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const results = await this.resultService.getByStudentAndSemester(studentId, semester, academicYear);
    sendSuccess(res, { results, hasData: results.length > 0 });
  };

  getByExamType = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const examType = String(req.query.examType);
    const academicYear = String(req.query.academicYear);
    const results = await this.resultService.getByExamType(studentId, examType, academicYear);
    sendSuccess(res, { results, hasData: results.length > 0 });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const result = await this.resultService.create(req.body);
    sendSuccess(res, result, 201);
  };

  bulkCreate = async (req: Request, res: Response): Promise<void> => {
    const count = await this.resultService.bulkCreate(req.body.results);
    sendSuccess(res, { created: count }, 201);
  };

  getDepartmentResults = async (req: Request, res: Response): Promise<void> => {
    const department = String(req.query.department);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const stats = await this.resultService.getDepartmentResults(department, semester, academicYear);
    sendSuccess(res, { department, semester, academicYear, stats });
  };

  getCgpa = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const cgpa = await this.resultService.getCgpa(studentId);
    sendSuccess(res, { studentId, cgpa });
  };
}
