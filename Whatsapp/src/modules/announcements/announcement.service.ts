import type { IAnnouncementRepository } from '../../repositories/announcement.repository.js';
import type { AnnouncementRecord, AnnouncementPriority } from '../../repositories/types.js';
import { NotFoundError, ValidationError } from '../../shared/utils/errors.js';
import type { NotificationService } from '../notifications/notification.service.js';
import logger from '../../shared/utils/logger.js';

const serviceLogger = logger.child({ module: 'announcement-service' });

const PRIORITY_MAP: Record<AnnouncementPriority, 'low' | 'normal' | 'high' | 'urgent'> = {
  low: 'low',
  normal: 'normal',
  high: 'high',
  urgent: 'urgent',
};

export class AnnouncementService {
  constructor(
    private readonly repo: IAnnouncementRepository,
    private readonly notificationService?: NotificationService,
  ) {}

  async getById(id: string): Promise<AnnouncementRecord | null> {
    return this.repo.findById(id);
  }

  async getActive(audience?: string, department?: string, semester?: number, academicYear?: string): Promise<AnnouncementRecord[]> {
    return this.repo.findActive(audience, department, semester, academicYear);
  }

  async getByDepartment(department: string): Promise<AnnouncementRecord[]> {
    return this.repo.findByDepartment(department);
  }

  async getBySemester(semester: number, academicYear: string): Promise<AnnouncementRecord[]> {
    return this.repo.findBySemester(semester, academicYear);
  }

  async getExpired(): Promise<AnnouncementRecord[]> {
    return this.repo.findExpired();
  }

  async create(data: Omit<AnnouncementRecord, 'id' | 'createdAt' | 'updatedAt'>, sendNotification: boolean = false): Promise<AnnouncementRecord> {
    if (data.category === 'department' && !data.department) {
      throw new ValidationError('Department announcements must specify a department');
    }

    if (data.expiresAt && data.publishedAt && data.expiresAt <= data.publishedAt) {
      throw new ValidationError('Expiry date must be after publish date');
    }

    if (data.targetSemesters?.length && (data.semester !== null && data.semester !== undefined)) {
      throw new ValidationError('Cannot set both semester and targetSemesters');
    }

    const announcement = await this.repo.create({
      ...data,
      publishedAt: data.publishedAt ?? new Date(),
    });

    if (sendNotification && this.notificationService) {
      await this.sendAnnouncementNotification(announcement);
    }

    serviceLogger.info({ announcementId: announcement.id, title: announcement.title }, 'Announcement created');
    return announcement;
  }

  async update(id: string, data: Partial<Omit<AnnouncementRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AnnouncementRecord> {
    if (data.category === 'department' && !data.department) {
      throw new ValidationError('Department announcements must specify a department');
    }

    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError('Announcement');
    return updated;
  }

  async publish(id: string, sendNotification: boolean = false): Promise<AnnouncementRecord> {
    const announcement = await this.update(id, {
      isActive: true,
      publishedAt: new Date(),
    });

    if (sendNotification && this.notificationService) {
      await this.sendAnnouncementNotification(announcement);
    }

    serviceLogger.info({ announcementId: id }, 'Announcement published');
    return announcement;
  }

  async unpublish(id: string): Promise<AnnouncementRecord> {
    const announcement = await this.update(id, { isActive: false });
    serviceLogger.info({ announcementId: id }, 'Announcement unpublished');
    return announcement;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError('Announcement');
    serviceLogger.info({ announcementId: id }, 'Announcement deleted');
    return true;
  }

  async getExpiringSoon(withinHours: number = 24): Promise<AnnouncementRecord[]> {
    return this.repo.findExpiringSoon(withinHours);
  }

  async getCount(): Promise<number> {
    return this.repo.countActive();
  }

  private async sendAnnouncementNotification(announcement: AnnouncementRecord): Promise<void> {
    if (!this.notificationService) return;

    try {
      const title = announcement.title;
      const body = announcement.content;
      const priority = PRIORITY_MAP[announcement.priority] ?? 'normal';

      if (announcement.audience === 'all') {
        await this.notificationService.createGeneralAnnouncement({
          title,
          body,
          priority,
        });
      } else if (announcement.audience === 'department' && announcement.department) {
        await this.notificationService.createGeneralAnnouncement({
          title,
          body: `${announcement.department} Department: ${body}`,
          priority,
        });
      } else {
        await this.notificationService.createGeneralAnnouncement({
          title,
          body,
          priority,
        });
      }

      serviceLogger.info({ announcementId: announcement.id }, 'Announcement notifications sent');
    } catch (err) {
      serviceLogger.error({ announcementId: announcement.id, err }, 'Failed to send announcement notifications');
    }
  }
}
