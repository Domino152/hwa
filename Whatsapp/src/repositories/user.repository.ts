import type { UserRecord } from './types.js';

export interface IUserRepository {
  findByPhone(phone: string): Promise<UserRecord | null>;
  findByStudentId(studentId: string): Promise<UserRecord | null>;
  findParentByStudentId(studentId: string): Promise<UserRecord | null>;
}
