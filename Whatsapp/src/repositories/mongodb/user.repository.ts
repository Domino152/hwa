import { User } from '../../database/models/User.js';
import type { IUserRepository } from '../user.repository.js';
import type { UserRecord } from '../types.js';

function toUserRecord(doc: { _id: unknown; fullName: string; role: 'student' | 'parent'; studentId: string; department: string; year: number; section: string; whatsappNumber: string | null }): UserRecord {
  return {
    id: String(doc._id),
    fullName: doc.fullName,
    role: doc.role,
    studentId: doc.studentId,
    department: doc.department,
    year: doc.year,
    section: doc.section,
    whatsappNumber: doc.whatsappNumber,
  };
}

export class MongoUserRepository implements IUserRepository {
  async findByPhone(phone: string): Promise<UserRecord | null> {
    const doc = await User.findByPhone(phone);
    if (!doc) return null;
    return toUserRecord(doc);
  }

  async findByStudentId(studentId: string): Promise<UserRecord | null> {
    const doc = await User.findOne({ studentId, isActive: true }, '-passwordHash');
    if (!doc) return null;
    return toUserRecord(doc);
  }

  async findParentByStudentId(studentId: string): Promise<UserRecord | null> {
    const doc = await User.findOne({ role: 'parent', studentId, isActive: true }, '-passwordHash');
    if (!doc) return null;
    return toUserRecord(doc);
  }
}
