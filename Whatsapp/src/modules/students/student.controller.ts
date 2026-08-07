import type { Request, Response } from 'express';
import { StudentService } from './student.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/errors.js';
import {
  createStudentSchema,
  updateStudentSchema,
  studentQuerySchema,
} from './student.schemas.js';

export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const student = await this.studentService.getById(id);
    sendSuccess(res, student);
  };

  getByStudentId = async (req: Request, res: Response): Promise<void> => {
    const studentId = String(req.params.studentId);
    const student = await this.studentService.getByStudentId(studentId);
    sendSuccess(res, student);
  };

  getByRegisterNumber = async (req: Request, res: Response): Promise<void> => {
    const registerNumber = String(req.params.registerNumber);
    const student = await this.studentService.getByRegisterNumber(registerNumber);
    sendSuccess(res, student);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const parsed = studentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error.format());
    }

    const { page, limit, ...filter } = parsed.data;
    const result = await this.studentService.list(filter, { page, limit });
    sendSuccess(res, result);
  };

  getByDepartment = async (req: Request, res: Response): Promise<void> => {
    const department = String(req.params.department);
    const students = await this.studentService.getByDepartment(department);
    sendSuccess(res, { students, total: students.length });
  };

  getByClass = async (req: Request, res: Response): Promise<void> => {
    const department = String(req.params.department);
    const semester = Number(req.params.semester);
    const section = String(req.params.section);
    const students = await this.studentService.getByClass(department, semester, section);
    sendSuccess(res, { students, total: students.length });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const parsed = createStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.format());
    }

    const student = await this.studentService.create({
      ...parsed.data,
      dateOfBirth: new Date(parsed.data.dateOfBirth),
    });
    sendSuccess(res, student, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.format());
    }

    const id = String(req.params.id);
    const { dateOfBirth, ...rest } = parsed.data;
    const updateData = {
      ...rest,
      ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
    };

    const student = await this.studentService.update(id, updateData);
    sendSuccess(res, student);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    await this.studentService.delete(id);
    sendSuccess(res, { message: 'Student deleted successfully' });
  };

  search = async (req: Request, res: Response): Promise<void> => {
    const parsed = studentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error.format());
    }

    const { page, limit, ...filter } = parsed.data;
    const result = await this.studentService.list(filter, { page, limit });
    sendSuccess(res, result);
  };

  count = async (req: Request, res: Response): Promise<void> => {
    const parsed = studentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error.format());
    }

    const { page: _page, limit: _limit, ...filter } = parsed.data;
    const total = await this.studentService.count(filter);
    sendSuccess(res, { total });
  };
}
