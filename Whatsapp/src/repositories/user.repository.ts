import type { UserRecord } from './types.js';

export interface IUserRepository {
  findByPhone(phone: string): Promise<UserRecord | null>;
  findByStudentId(studentId: string): Promise<UserRecord | null>;
  findParentByStudentId(studentId: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  findStudentsByClass(department: string, year: number, section: string): Promise<UserRecord[]>;
  findLinkedStudents(parentId: string): Promise<UserRecord[]>;
  updateWhatsAppNumber(userId: string, phone: string | null): Promise<void>;
}
