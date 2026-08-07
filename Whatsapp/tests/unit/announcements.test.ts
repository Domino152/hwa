import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnnouncementService } from '../../src/modules/announcements/announcement.service.js';
import type { IAnnouncementRepository } from '../../src/repositories/announcement.repository.js';
import type { AnnouncementRecord } from '../../src/repositories/types.js';

function makeAnnouncement(overrides: Partial<AnnouncementRecord> = {}): AnnouncementRecord {
  return {
    id: '507f1f77bcf86cd799439011',
    title: 'College Holiday Notice',
    content: 'College will remain closed on Monday due to festival',
    category: 'college',
    audience: 'all',
    department: null,
    semester: null,
    academicYear: null,
    targetSemesters: [],
    priority: 'normal',
    attachments: [],
    isActive: true,
    publishedAt: new Date(),
    expiresAt: null,
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AnnouncementService', () => {
  let repo: IAnnouncementRepository;
  let service: AnnouncementService;

  beforeEach(() => {
    repo = {
      findById: vi.fn(),
      findActive: vi.fn(),
      findByDepartment: vi.fn(),
      findBySemester: vi.fn(),
      findExpired: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findExpiringSoon: vi.fn(),
      countActive: vi.fn(),
    };
    service = new AnnouncementService(repo);
  });

  describe('getById', () => {
    it('returns an announcement by id', async () => {
      const ann = makeAnnouncement();
      vi.mocked(repo.findById).mockResolvedValue(ann);

      const result = await service.getById(ann.id);
      expect(result?.title).toBe('College Holiday Notice');
    });

    it('returns null when not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);
      expect(await service.getById('nonexistent')).toBeNull();
    });
  });

  describe('getActive', () => {
    it('returns active announcements', async () => {
      const anns = [makeAnnouncement(), makeAnnouncement({ title: 'Second' })];
      vi.mocked(repo.findActive).mockResolvedValue(anns);

      const result = await service.getActive();
      expect(result).toHaveLength(2);
    });

    it('passes filters to repository', async () => {
      vi.mocked(repo.findActive).mockResolvedValue([]);

      await service.getActive('students', 'CSE', 4, '2025-26');
      expect(repo.findActive).toHaveBeenCalledWith('students', 'CSE', 4, '2025-26');
    });
  });

  describe('getByDepartment', () => {
    it('returns department announcements', async () => {
      const anns = [makeAnnouncement({ category: 'department', department: 'CSE' })];
      vi.mocked(repo.findByDepartment).mockResolvedValue(anns);

      const result = await service.getByDepartment('CSE');
      expect(result).toHaveLength(1);
      expect(result[0].department).toBe('CSE');
    });
  });

  describe('getBySemester', () => {
    it('returns semester-targeted announcements', async () => {
      const anns = [makeAnnouncement({ semester: 4, academicYear: '2025-26' })];
      vi.mocked(repo.findBySemester).mockResolvedValue(anns);

      const result = await service.getBySemester(4, '2025-26');
      expect(result).toHaveLength(1);
    });
  });

  describe('getExpired', () => {
    it('returns expired announcements', async () => {
      const anns = [makeAnnouncement({ expiresAt: new Date('2024-01-01') })];
      vi.mocked(repo.findExpired).mockResolvedValue(anns);

      const result = await service.getExpired();
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('creates a college announcement with default values', async () => {
      const created = makeAnnouncement({ category: 'college' });
      vi.mocked(repo.create).mockResolvedValue(created);

      const result = await service.create({
        title: 'Holiday Notice',
        content: 'College closed',
        category: 'college',
        audience: 'all',
        department: null,
        semester: null,
        academicYear: null,
        targetSemesters: [],
        priority: 'normal',
        attachments: [],
        isActive: true,
        publishedAt: new Date(),
        expiresAt: null,
        createdBy: 'admin',
      });

      expect(result.title).toBe('College Holiday Notice');
      expect(result.category).toBe('college');
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Holiday Notice',
        category: 'college',
      }));
    });

    it('creates a department announcement with department specified', async () => {
      const created = makeAnnouncement({ category: 'department', department: 'CSE', priority: 'high' });
      vi.mocked(repo.create).mockResolvedValue(created);

      const result = await service.create({
        title: 'CSE Workshop',
        content: 'Workshop on AI',
        category: 'department',
        audience: 'department',
        department: 'CSE',
        semester: 4,
        academicYear: '2025-26',
        targetSemesters: [],
        priority: 'high',
        attachments: [],
        isActive: true,
        publishedAt: new Date(),
        expiresAt: null,
        createdBy: 'F001',
      });

      expect(result.department).toBe('CSE');
      expect(result.priority).toBe('high');
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'CSE Workshop',
        department: 'CSE',
        priority: 'high',
      }));
    });

    it('throws when department announcement has no department', async () => {
      await expect(
        service.create({
          title: 'Bad',
          content: 'Bad',
          category: 'department',
          audience: 'department',
          department: undefined as unknown as null,
          semester: null,
          academicYear: null,
          targetSemesters: [],
          priority: 'normal',
          attachments: [],
          isActive: true,
          publishedAt: null,
          expiresAt: null,
          createdBy: 'admin',
        }),
      ).rejects.toThrow('Department announcements must specify a department');
    });

    it('throws when expiresAt <= publishedAt', async () => {
      await expect(
        service.create({
          title: 'Bad',
          content: 'Bad',
          category: 'college',
          audience: 'all',
          department: null,
          semester: null,
          academicYear: null,
          targetSemesters: [],
          priority: 'normal',
          attachments: [],
          isActive: true,
          publishedAt: new Date('2025-06-01'),
          expiresAt: new Date('2025-05-01'),
          createdBy: 'admin',
        }),
      ).rejects.toThrow('Expiry date must be after publish date');
    });

    it('sets publishedAt to now when not provided', async () => {
      const created = makeAnnouncement();
      vi.mocked(repo.create).mockResolvedValue(created);

      await service.create({
        title: 'Test',
        content: 'Test',
        category: 'college',
        audience: 'all',
        department: null,
        semester: null,
        academicYear: null,
        targetSemesters: [],
        priority: 'normal',
        attachments: [],
        isActive: true,
        publishedAt: null,
        expiresAt: null,
        createdBy: 'admin',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ publishedAt: expect.any(Date) }),
      );
    });
  });

  describe('update', () => {
    it('updates an announcement', async () => {
      const existing = makeAnnouncement();
      const updated = makeAnnouncement({ title: 'Updated' });
      vi.mocked(repo.findById).mockResolvedValue(existing);
      vi.mocked(repo.update).mockResolvedValue(updated);

      const result = await service.update(existing.id, { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('throws NotFoundError when not found', async () => {
      vi.mocked(repo.update).mockResolvedValue(null);
      await expect(service.update('nonexistent', { title: 'No' })).rejects.toThrow('Announcement not found');
    });

    it('throws when department update has no department', async () => {
      await expect(
        service.update('id', { category: 'department', department: null }),
      ).rejects.toThrow('Department announcements must specify a department');
    });
  });

  describe('publish', () => {
    it('publishes an announcement', async () => {
      const existing = makeAnnouncement({ isActive: false });
      const published = makeAnnouncement({ isActive: true });
      vi.mocked(repo.update).mockResolvedValue(published);

      const result = await service.publish(existing.id);
      expect(result.isActive).toBe(true);
    });
  });

  describe('unpublish', () => {
    it('unpublishes an announcement', async () => {
      const existing = makeAnnouncement({ isActive: true });
      const unpublished = makeAnnouncement({ isActive: false });
      vi.mocked(repo.update).mockResolvedValue(unpublished);

      const result = await service.unpublish(existing.id);
      expect(result.isActive).toBe(false);
    });
  });

  describe('delete', () => {
    it('deletes an announcement', async () => {
      vi.mocked(repo.delete).mockResolvedValue(true);
      await expect(service.delete(makeAnnouncement().id)).resolves.not.toThrow();
    });

    it('throws NotFoundError when not found', async () => {
      vi.mocked(repo.delete).mockResolvedValue(false);
      await expect(service.delete('nonexistent')).rejects.toThrow('Announcement not found');
    });
  });

  describe('getExpiringSoon', () => {
    it('returns announcements expiring soon', async () => {
      const anns = [makeAnnouncement({ expiresAt: new Date(Date.now() + 3600000) })];
      vi.mocked(repo.findExpiringSoon).mockResolvedValue(anns);

      const result = await service.getExpiringSoon(24);
      expect(result).toHaveLength(1);
    });
  });

  describe('getCount', () => {
    it('returns count of active announcements', async () => {
      vi.mocked(repo.countActive).mockResolvedValue(5);
      expect(await service.getCount()).toBe(5);
    });
  });

  describe('with NotificationService', () => {
    it('sends notifications on create when sendNotification is true', async () => {
      const mockNotificationService = {
        createGeneralAnnouncement: vi.fn().mockResolvedValue([]),
      } as unknown as import('../../src/modules/notifications/notification.service.js').NotificationService;

      const serviceWithNotif = new AnnouncementService(repo, mockNotificationService);
      const created = makeAnnouncement();
      vi.mocked(repo.create).mockResolvedValue(created);

      await serviceWithNotif.create({
        title: 'Test',
        content: 'Test',
        category: 'college',
        audience: 'all',
        department: null,
        semester: null,
        academicYear: null,
        targetSemesters: [],
        priority: 'normal',
        attachments: [],
        isActive: true,
        publishedAt: null,
        expiresAt: null,
        createdBy: 'admin',
      }, true);

      expect(mockNotificationService.createGeneralAnnouncement).toHaveBeenCalled();
    });

    it('does not send notifications when sendNotification is false', async () => {
      const mockNotificationService = {
        createGeneralAnnouncement: vi.fn(),
      } as unknown as import('../../src/modules/notifications/notification.service.js').NotificationService;

      const serviceWithNotif = new AnnouncementService(repo, mockNotificationService);
      const created = makeAnnouncement();
      vi.mocked(repo.create).mockResolvedValue(created);

      await serviceWithNotif.create({
        title: 'Test',
        content: 'Test',
        category: 'college',
        audience: 'all',
        department: null,
        semester: null,
        academicYear: null,
        targetSemesters: [],
        priority: 'normal',
        attachments: [],
        isActive: true,
        publishedAt: null,
        expiresAt: null,
        createdBy: 'admin',
      }, false);

      expect(mockNotificationService.createGeneralAnnouncement).not.toHaveBeenCalled();
    });
  });
});
