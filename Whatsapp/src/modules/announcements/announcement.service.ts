import type { IAnnouncementRepository } from '../../repositories/announcement.repository.js';
import type { AnnouncementRecord } from '../../repositories/types.js';
import { NotFoundError } from '../../shared/utils/errors.js';

export class AnnouncementService {
  constructor(private readonly repo: IAnnouncementRepository) {}

  async getById(id: string): Promise<AnnouncementRecord | null> {
    return this.repo.findById(id);
  }

  async getActive(audience?: string, department?: string): Promise<AnnouncementRecord[]> {
    return this.repo.findActive(audience, department);
  }

  async getByDepartment(department: string): Promise<AnnouncementRecord[]> {
    return this.repo.findByDepartment(department);
  }

  async create(data: Omit<AnnouncementRecord, 'id' | 'createdAt'>): Promise<AnnouncementRecord> {
    return this.repo.create({
      ...data,
      publishedAt: data.publishedAt ?? new Date(),
    });
  }

  async update(id: string, data: Partial<Omit<AnnouncementRecord, 'id' | 'createdAt'>>): Promise<AnnouncementRecord> {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError('Announcement');
    return updated;
  }

  async publish(id: string): Promise<AnnouncementRecord> {
    return this.update(id, { isActive: true, publishedAt: new Date() });
  }

  async unpublish(id: string): Promise<AnnouncementRecord> {
    return this.update(id, { isActive: false });
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError('Announcement');
    return true;
  }

  async getExpiringSoon(withinHours: number = 24): Promise<AnnouncementRecord[]> {
    return this.repo.findExpiringSoon(withinHours);
  }
}
