import type { Request, Response } from 'express';
import { AnnouncementService } from './announcement.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const audience = req.query.audience as string | undefined;
    const department = req.query.department as string | undefined;
    const announcements = await this.announcementService.getActive(audience, department);
    sendSuccess(res, { announcements, total: announcements.length });
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

  create = async (req: Request, res: Response): Promise<void> => {
    const announcement = await this.announcementService.create({
      ...req.body,
      createdBy: 'admin',
    });
    sendSuccess(res, announcement, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const announcement = await this.announcementService.update(id, req.body);
    sendSuccess(res, announcement);
  };

  publish = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const announcement = await this.announcementService.publish(id);
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
