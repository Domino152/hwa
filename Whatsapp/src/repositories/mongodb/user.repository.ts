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

  async findById(id: string): Promise<UserRecord | null> {
    const doc = await User.findById(id, '-passwordHash');
    if (!doc) return null;
    return toUserRecord(doc);
  }

  async findStudentsByClass(department: string, year: number, section: string): Promise<UserRecord[]> {
    const docs = await User.find({ role: 'student', department, year, section, isActive: true }, '-passwordHash').sort({ studentId: 1 });
    return docs.map(toUserRecord);
  }

  async findLinkedStudents(parentId: string): Promise<UserRecord[]> {
    const parent = await User.findById(parentId, '-passwordHash');
    if (!parent || parent.role !== 'parent') return [];
    const student = await User.findOne({ studentId: parent.studentId, role: 'student', isActive: true }, '-passwordHash');
    return student ? [toUserRecord(student)] : [];
  }

  async updateWhatsAppNumber(userId: string, phone: string | null): Promise<void> {
    await User.findByIdAndUpdate(userId, { whatsappNumber: phone });
  }
}
