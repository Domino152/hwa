import type { Request, Response } from 'express';
import { AnnouncementService } from './announcement.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/errors.js';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementQuerySchema,
  publishAnnouncementSchema,
} from './announcement.schemas.js';

export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const parsed = announcementQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError('Invalid query parameters', parsed.error.format());

    const { audience, department, semester, academicYear, category, priority, page, limit } = parsed.data;
    let announcements = await this.announcementService.getActive(audience, department, semester, academicYear);

    if (category) {
      announcements = announcements.filter((a) => a.category === category);
    }
    if (priority) {
      announcements = announcements.filter((a) => a.priority === priority);
    }

    const total = announcements.length;
    const offset = (page - 1) * limit;
    const paginated = announcements.slice(offset, offset + limit);

    sendSuccess(res, { announcements: paginated, total, page, limit });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const announcement = await this.announcementService.getById(id);
    if (!announcement) {
      sendSuccess(res, { error: 'Announcement not found' }, 404);
      return;
    }
    sendSuccess(res, announcement);
  };

  getByDepartment = async (req: Request, res: Response): Promise<void> => {
    const department = String(req.params.department);
    const announcements = await this.announcementService.getByDepartment(department);
    sendSuccess(res, { announcements, total: announcements.length });
  };

  getBySemester = async (req: Request, res: Response): Promise<void> => {
    const semester = Number(req.params.semester);
    const academicYear = String(req.query.academicYear);
    if (!academicYear) {
      throw new ValidationError('academicYear query parameter is required');
    }
    const announcements = await this.announcementService.getBySemester(semester, academicYear);
    sendSuccess(res, { announcements, total: announcements.length });
  };

  getExpired = async (_req: Request, res: Response): Promise<void> => {
    const announcements = await this.announcementService.getExpired();
    sendSuccess(res, { announcements, total: announcements.length });
  };

  getCount = async (_req: Request, res: Response): Promise<void> => {
    const count = await this.announcementService.getCount();
    sendSuccess(res, { count });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const parsed = createAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());

    const { sendNotification, publishedAt, expiresAt, ...rest } = parsed.data;
    const announcement = await this.announcementService.create({
      ...rest,
      department: rest.department ?? null,
      semester: rest.semester ?? null,
      academicYear: rest.academicYear ?? null,
      targetSemesters: rest.targetSemesters ?? [],
      attachments: rest.attachments ?? [],
      isActive: true,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: 'admin',
    }, sendNotification);

    sendSuccess(res, announcement, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = updateAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.format());

    const { publishedAt, expiresAt, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (publishedAt !== undefined) updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const announcement = await this.announcementService.update(id, updateData);
    sendSuccess(res, announcement);
  };

  publish = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = publishAnnouncementSchema.safeParse(req.body);
    const sendNotification = parsed.success ? parsed.data.sendNotification : false;

    const announcement = await this.announcementService.publish(id, sendNotification);
    sendSuccess(res, announcement);
  };

  unpublish = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const announcement = await this.announcementService.unpublish(id);
    sendSuccess(res, announcement);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    await this.announcementService.delete(id);
    sendSuccess(res, { message: 'Announcement deleted successfully' });
  };

  getExpiringSoon = async (req: Request, res: Response): Promise<void> => {
    const hours = Number(req.query.hours) || 24;
    const announcements = await this.announcementService.getExpiringSoon(hours);
    sendSuccess(res, { announcements, total: announcements.length });
  };
}
