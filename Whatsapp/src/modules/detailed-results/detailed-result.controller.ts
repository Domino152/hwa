import type { Request, Response } from 'express';
import { DetailedResultService } from './detailed-result.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class DetailedResultController {
  constructor(private readonly service: DetailedResultService) {}

  getByStudent = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const academicYear = req.query.academicYear as string | undefined;
    const results = await this.service.getByStudent(studentId, academicYear);
    sendSuccess(res, {
      studentId,
      results,
      count: results.length,
      hasData: results.length > 0,
    });
  };

  getByStudentSemester = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const results = await this.service.getByStudentSemester(studentId, semester, academicYear);
    sendSuccess(res, {
      studentId,
      semester,
      academicYear,
      results,
      count: results.length,
      hasData: results.length > 0,
    });
  };

  getByStudentSubject = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const subjectCode = String(req.params.subjectCode);
    const academicYear = String(req.query.academicYear);
    const results = await this.service.getByStudentSubject(studentId, subjectCode, academicYear);
    sendSuccess(res, {
      studentId,
      subjectCode: subjectCode.toUpperCase(),
      results,
      count: results.length,
    });
  };

  getBySubject = async (req: Request, res: Response): Promise<void> => {
    const subjectCode = String(req.params.subjectCode);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const results = await this.service.getBySubject(subjectCode, semester, academicYear);
    sendSuccess(res, {
      subjectCode: subjectCode.toUpperCase(),
      semester,
      academicYear,
      results,
      count: results.length,
    });
  };

  getSemesterGpa = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const gpa = await this.service.getSemesterGpa(studentId, semester, academicYear);
    sendSuccess(res, {
      studentId,
      semester,
      academicYear,
      hasData: gpa !== null,
      semesterGpa: gpa,
    });
  };

  getCgpa = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const cgpa = await this.service.getCgpa(studentId);
    sendSuccess(res, {
      ...cgpa,
      studentId,
      hasData: cgpa.totalSubjects > 0,
    });
  };

  getSubjectStats = async (req: Request, res: Response): Promise<void> => {
    const subjectCode = String(req.params.subjectCode);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const stats = await this.service.getSubjectStats(subjectCode, semester, academicYear);
    if (!stats) {
      sendSuccess(res, {
        subjectCode: subjectCode.toUpperCase(),
        semester,
        academicYear,
        hasData: false,
      });
      return;
    }
    sendSuccess(res, { hasData: true, ...stats });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.create(req.body);
    sendSuccess(res, result, 201);
  };

  bulkCreate = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.bulkCreate(req.body.results);
    sendSuccess(res, result, 201);
  };

  deleteResult = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const subjectCode = String(req.params.subjectCode);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const deleted = await this.service.deleteResult(
      studentId,
      subjectCode,
      semester,
      academicYear,
    );
    sendSuccess(res, { deleted });
  };

  publishResults = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const semester = Number(req.body.semester);
    const academicYear = String(req.body.academicYear);
    const count = await this.service.publishResults(studentId, semester, academicYear);
    sendSuccess(res, { published: count });
  };
}