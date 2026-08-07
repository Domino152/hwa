import type { Request, Response } from 'express';
import { SubjectService } from './subject.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const department = req.query.department as string | undefined;
    const semester = req.query.semester as string | undefined;
    const search = req.query.search as string | undefined;

    let subjects;
    if (search) {
      subjects = await this.subjectService.search(search);
    } else if (department && semester) {
      subjects = await this.subjectService.getByDepartmentAndSemester(department, Number(semester));
    } else if (department) {
      subjects = await this.subjectService.getByDepartment(department);
    } else {
      subjects = await this.subjectService.search('');
    }

    sendSuccess(res, { subjects, total: subjects.length });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const subject = await this.subjectService.getById(id);
    if (!subject) {
      sendSuccess(res, { error: 'Subject not found' }, 404);
      return;
    }
    sendSuccess(res, subject);
  };

  getByCode = async (req: Request, res: Response): Promise<void> => {
    const code = String(req.params.code);
    const subject = await this.subjectService.getByCode(code);
    if (!subject) {
      sendSuccess(res, { error: 'Subject not found' }, 404);
      return;
    }
    sendSuccess(res, subject);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const subject = await this.subjectService.create(req.body);
    sendSuccess(res, subject, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const subject = await this.subjectService.update(id, req.body);
    sendSuccess(res, subject);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    await this.subjectService.delete(id);
    sendSuccess(res, { message: 'Subject deleted successfully' });
  };
}
