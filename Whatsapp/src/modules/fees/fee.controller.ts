import type { Request, Response } from 'express';
import { FeeService } from './fee.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class FeeController {
  constructor(private readonly feeService: FeeService) {}

  getByStudentId = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const fee = await this.feeService.getByStudentId(studentId);
    sendSuccess(res, { fee, hasData: !!fee });
  };

  getByStudentAll = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const fees = await this.feeService.getByStudentAll(studentId);
    sendSuccess(res, { fees, hasData: fees.length > 0 });
  };

  getByStudentAndSemester = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const fees = await this.feeService.getByStudentAndSemester(studentId, semester, academicYear);
    sendSuccess(res, { fees, hasData: fees.length > 0 });
  };

  updatePayment = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const feeType = String(req.query.feeType);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const { paidAmount } = req.body;
    const fee = await this.feeService.updatePayment(studentId, feeType, semester, academicYear, paidAmount);
    sendSuccess(res, { fee });
  };

  getOverdueFees = async (req: Request, res: Response): Promise<void> => {
    const academicYear = String(req.query.academicYear);
    const fees = await this.feeService.getOverdueFees(academicYear);
    sendSuccess(res, { fees, total: fees.length });
  };

  getDepartmentSummary = async (req: Request, res: Response): Promise<void> => {
    const department = String(req.query.department);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);
    const summary = await this.feeService.getDepartmentSummary(department, semester, academicYear);
    sendSuccess(res, summary);
  };
}
