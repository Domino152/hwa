import type { Request, Response } from 'express';
import { SubjectService } from './subject.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { NotFoundError, ValidationError } from '../../shared/utils/errors.js';
import { createSubjectSchema, updateSubjectSchema } from './subject.schemas.js';

export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const department = req.query.department as string | undefined;
    const semester = req.query.semester as string | undefined;
    const search = req.query.search as string | undefined;
    const faculty = req.query.faculty as string | undefined;

    let subjects;
    if (search) {
      subjects = await this.subjectService.search(search);
    } else if (faculty) {
      subjects = await this.subjectService.getByFaculty(faculty);
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
    if (!subject) throw new NotFoundError('Subject');
    sendSuccess(res, subject);
  };

  getByCode = async (req: Request, res: Response): Promise<void> => {
    const code = String(req.params.code);
    const subject = await this.subjectService.getByCode(code);
    if (!subject) throw new NotFoundError('Subject');
    sendSuccess(res, subject);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const parsed = createSubjectSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.format());
    }
    const subject = await this.subjectService.create(parsed.data);
    sendSuccess(res, subject, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateSubjectSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.format());
    }
    const id = String(req.params.id);
    const subject = await this.subjectService.update(id, parsed.data);
    sendSuccess(res, subject);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    await this.subjectService.delete(id);
    sendSuccess(res, { message: 'Subject deleted successfully' });
  };

  getPrerequisites = async (req: Request, res: Response): Promise<void> => {
    const code = String(req.params.code);
    const subject = await this.subjectService.getByCode(code);
    if (!subject) throw new NotFoundError('Subject');

    const prerequisites = await this.subjectService.getPrerequisites(code);
    sendSuccess(res, {
      subjectCode: code,
      prerequisites,
      total: prerequisites.length,
    });
  };

  getSchedule = async (req: Request, res: Response): Promise<void> => {
    const code = String(req.params.code);
    const result = await this.subjectService.getScheduleForSubject(code);
    sendSuccess(res, {
      subject: result.subject,
      schedule: result.schedule,
      total: result.schedule.length,
    });
  };

  getResults = async (req: Request, res: Response): Promise<void> => {
    const code = String(req.params.code);
    const semester = Number(req.query.semester);
    const academicYear = String(req.query.academicYear);

    if (!semester || !academicYear) {
      throw new ValidationError('semester and academicYear are required');
    }

    const result = await this.subjectService.getResultsForSubject(code, semester, academicYear);
    sendSuccess(res, result);
  };

  validatePrerequisites = async (req: Request, res: Response): Promise<void> => {
    const code = String(req.params.code);
    const validation = await this.subjectService.validatePrerequisiteChain(code);
    sendSuccess(res, {
      subjectCode: code,
      ...validation,
    });
  };
}
