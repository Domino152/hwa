import { Announcement, type IAnnouncement } from '../../database/models/Announcement.js';
import type { IAnnouncementRepository } from '../announcement.repository.js';
import type { AnnouncementRecord, AnnouncementAttachment } from '../types.js';

function toRecord(doc: IAnnouncement & { _id: unknown }): AnnouncementRecord {
  return {
    id: String(doc._id),
    title: doc.title,
    content: doc.content,
    category: doc.category,
    audience: doc.audience,
    department: doc.department ?? null,
    semester: doc.semester ?? null,
    academicYear: doc.academicYear ?? null,
    targetSemesters: doc.targetSemesters ?? [],
    priority: doc.priority,
    attachments: (doc.attachments ?? []).map((a: AnnouncementAttachment) => ({
      url: a.url,
      name: a.name,
      type: a.type,
    })),
    isActive: doc.isActive,
    publishedAt: doc.publishedAt,
    expiresAt: doc.expiresAt,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoAnnouncementRepository implements IAnnouncementRepository {
  async findById(id: string): Promise<AnnouncementRecord | null> {
    const doc = await Announcement.findById(id);
    return doc ? toRecord(doc) : null;
  }

  async findActive(audience?: string, department?: string, semester?: number, academicYear?: string): Promise<AnnouncementRecord[]> {
    const query: Record<string, unknown> = { isActive: true };

    if (audience) {
      query.audience = { $in: [audience, 'all'] };
    }

    if (department) {
      query.$or = [{ audience: 'all' }, { audience: 'department', department }];
    }

    if (semester !== undefined && academicYear) {
      query.$and = query.$and ?? [];
      (query.$and as Record<string, unknown>[]).push({
        $or: [
          { semester: null },
          { semester, academicYear },
        ],
      });
    }

    const docs = await Announcement.find(query).sort({ priority: -1, publishedAt: -1, createdAt: -1 });
    return docs.map(toRecord);
  }

  async findByDepartment(department: string): Promise<AnnouncementRecord[]> {
    const docs = await Announcement.find({
      department,
      isActive: true,
      $or: [{ category: 'department' }, { audience: 'department' }],
    }).sort({ publishedAt: -1, createdAt: -1 });
    return docs.map(toRecord);
  }

  async findBySemester(semester: number, academicYear: string): Promise<AnnouncementRecord[]> {
    const docs = await Announcement.find({
      isActive: true,
      $or: [
        { targetSemesters: { $in: [semester] }, academicYear },
        { semester, academicYear },
        { semester: null, academicYear: null },
      ],
    }).sort({ publishedAt: -1, createdAt: -1 });
    return docs.map(toRecord);
  }

  async findExpired(): Promise<AnnouncementRecord[]> {
    const docs = await Announcement.find({
      expiresAt: { $ne: null, $lte: new Date() },
    }).sort({ expiresAt: -1 });
    return docs.map(toRecord);
  }

  async create(announcement: Omit<AnnouncementRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AnnouncementRecord> {
    const doc = await Announcement.create(announcement);
    return toRecord(doc);
  }

  async update(id: string, data: Partial<Omit<AnnouncementRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AnnouncementRecord | null> {
    const doc = await Announcement.findByIdAndUpdate(id, { $set: data }, { new: true });
    return doc ? toRecord(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Announcement.findByIdAndDelete(id);
    return !!result;
  }

  async findExpiringSoon(withinHours: number): Promise<AnnouncementRecord[]> {
    const deadline = new Date(Date.now() + withinHours * 60 * 60 * 1000);
    const docs = await Announcement.find({
      isActive: true,
      expiresAt: { $ne: null, $lte: deadline, $gt: new Date() },
    }).sort({ expiresAt: 1 });
    return docs.map(toRecord);
  }

  async countActive(): Promise<number> {
    return Announcement.countDocuments({ isActive: true });
  }
}
