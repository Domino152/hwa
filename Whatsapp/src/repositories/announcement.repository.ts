import type { AnnouncementRecord } from './types.js';

export interface IAnnouncementRepository {
  findById(id: string): Promise<AnnouncementRecord | null>;
  findActive(audience?: string, department?: string, semester?: number, academicYear?: string): Promise<AnnouncementRecord[]>;
  findByDepartment(department: string): Promise<AnnouncementRecord[]>;
  findBySemester(semester: number, academicYear: string): Promise<AnnouncementRecord[]>;
  findExpired(): Promise<AnnouncementRecord[]>;
  create(announcement: Omit<AnnouncementRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AnnouncementRecord>;
  update(id: string, data: Partial<Omit<AnnouncementRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AnnouncementRecord | null>;
  delete(id: string): Promise<boolean>;
  findExpiringSoon(withinHours: number): Promise<AnnouncementRecord[]>;
  countActive(): Promise<number>;
}
