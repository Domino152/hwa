import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../../src/database/models/User.js';
import { Attendance } from '../../../src/database/models/Attendance.js';
import { Fee } from '../../../src/database/models/Fee.js';
import { Schedule } from '../../../src/database/models/Schedule.js';
import { Result } from '../../../src/database/models/Result.js';
import { PublicContent } from '../../../src/database/models/PublicContent.js';
import { MongoUserRepository } from '../../../src/repositories/mongodb/user.repository.js';
import { MongoAttendanceRepository } from '../../../src/repositories/mongodb/attendance.repository.js';
import { MongoFeeRepository } from '../../../src/repositories/mongodb/fee.repository.js';
import { MongoScheduleRepository } from '../../../src/repositories/mongodb/schedule.repository.js';
import { MongoResultRepository } from '../../../src/repositories/mongodb/result.repository.js';
import { MongoPublicContentRepository } from '../../../src/repositories/mongodb/public-content.repository.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 30_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('MongoUserRepository', () => {
  const repo = new MongoUserRepository();

  it('findByPhone returns user with matching whatsappNumber', async () => {
    await User.create({
      fullName: 'Arjun Sharma',
      username: '22CSE001',
      passwordHash: '$2b$10$hashedpw',
      role: 'student',
      studentId: '22CSE001',
      whatsappNumber: '917530063885',
      department: 'CSE',
      year: 4,
      section: 'A',
    });

    const result = await repo.findByPhone('917530063885');
    expect(result).not.toBeNull();
    expect(result!.studentId).toBe('22CSE001');
    expect(result!.fullName).toBe('Arjun Sharma');
  });

  it('findByPhone returns null for inactive user', async () => {
    await User.create({
      fullName: 'Inactive',
      username: 'inactive1',
      passwordHash: '$2b$10$hashedpw',
      role: 'student',
      studentId: 'INACTIVE1',
      whatsappNumber: '911111111111',
      department: 'CSE',
      year: 1,
      section: 'A',
      isActive: false,
    });

    const result = await repo.findByPhone('911111111111');
    expect(result).toBeNull();
  });

  it('findByPhone returns null for nonexistent phone', async () => {
    const result = await repo.findByPhone('999999999999');
    expect(result).toBeNull();
  });

  it('findByStudentId returns matching student', async () => {
    await User.create({
      fullName: 'Priya Patel',
      username: '22CSE002',
      passwordHash: '$2b$10$hashedpw',
      role: 'student',
      studentId: '22CSE002',
      whatsappNumber: null,
      department: 'CSE',
      year: 3,
      section: 'B',
    });

    const result = await repo.findByStudentId('22CSE002');
    expect(result).not.toBeNull();
    expect(result!.fullName).toBe('Priya Patel');
  });

  it('findParentByStudentId returns parent linked to student', async () => {
    await User.create({
      fullName: 'Raj Parent',
      username: 'P22CSE001',
      passwordHash: '$2b$10$hashedpw',
      role: 'parent',
      studentId: '22CSE001',
      whatsappNumber: '912222222222',
      department: 'CSE',
      year: 4,
      section: 'A',
    });

    const result = await repo.findParentByStudentId('22CSE001');
    expect(result).not.toBeNull();
    expect(result!.role).toBe('parent');
    expect(result!.fullName).toBe('Raj Parent');
  });

  it('findParentByStudentId returns null when no parent exists', async () => {
    const result = await repo.findParentByStudentId('NONEXISTENT');
    expect(result).toBeNull();
  });

  it('findByPhone does not return passwordHash', async () => {
    await User.create({
      fullName: 'Test User',
      username: 'testNOPW',
      passwordHash: '$2b$10$hashedpw',
      role: 'student',
      studentId: 'testNOPW',
      whatsappNumber: '913333333333',
      department: 'CSE',
      year: 1,
      section: 'A',
    });

    const result = await repo.findByPhone('913333333333');
    expect(result).not.toBeNull();
    expect(result!).not.toHaveProperty('passwordHash');
  });
});

describe('MongoAttendanceRepository', () => {
  const repo = new MongoAttendanceRepository();

  it('findStudentAttendance returns records sorted by subject', async () => {
    await Attendance.create({
      studentId: '22CSE001',
      subject: 'Mathematics',
      totalClasses: 50,
      attendedClasses: 45,
      percentage: 90,
      semester: 1,
      academicYear: '2025-26',
    });
    await Attendance.create({
      studentId: '22CSE001',
      subject: 'Data Structures',
      totalClasses: 48,
      attendedClasses: 40,
      percentage: 83.33,
      semester: 1,
      academicYear: '2025-26',
    });

    const results = await repo.findStudentAttendance('22CSE001');
    expect(results).toHaveLength(2);
    expect(results[0].subject).toBe('Data Structures');
    expect(results[1].subject).toBe('Mathematics');
  });

  it('findStudentAttendance returns empty array for unknown student', async () => {
    const results = await repo.findStudentAttendance('UNKNOWN');
    expect(results).toHaveLength(0);
  });

  it('findStudentAttendance returns correct record fields', async () => {
    await Attendance.create({
      studentId: '22CSE001',
      subject: 'Physics',
      totalClasses: 40,
      attendedClasses: 38,
      percentage: 95,
      semester: 1,
      academicYear: '2025-26',
    });

    const results = await repo.findStudentAttendance('22CSE001');
    expect(results[0]).toEqual({
      studentId: '22CSE001',
      subject: 'Physics',
      totalClasses: 40,
      attendedClasses: 38,
      percentage: 95,
      semester: 1,
      academicYear: '2025-26',
    });
  });
});

describe('MongoFeeRepository', () => {
  const repo = new MongoFeeRepository();

  it('findLatestFeeByStudentId returns most recent fee', async () => {
    const oldDate = new Date('2025-01-01');
    const newDate = new Date('2025-06-01');

    await Fee.create({
      studentId: '22CSE001',
      feeType: 'Tuition',
      totalFee: 100000,
      paidAmount: 50000,
      remainingAmount: 50000,
      dueDate: oldDate,
      status: 'partial',
      semester: 1,
      academicYear: '2024-25',
    });
    await Fee.create({
      studentId: '22CSE001',
      feeType: 'Hostel',
      totalFee: 80000,
      paidAmount: 80000,
      remainingAmount: 0,
      dueDate: newDate,
      status: 'paid',
      semester: 1,
      academicYear: '2025-26',
    });

    const result = await repo.findLatestFeeByStudentId('22CSE001');
    expect(result).not.toBeNull();
    expect(result!.feeType).toBe('Hostel');
    expect(result!.status).toBe('paid');
  });

  it('findLatestFeeByStudentId returns null for unknown student', async () => {
    const result = await repo.findLatestFeeByStudentId('UNKNOWN');
    expect(result).toBeNull();
  });

  it('findLatestFeeByStudentId returns correct record fields', async () => {
    await Fee.create({
      studentId: '22CSE001',
      feeType: 'Exam',
      totalFee: 5000,
      paidAmount: 0,
      remainingAmount: 5000,
      dueDate: new Date('2025-09-01'),
      status: 'pending',
      semester: 1,
      academicYear: '2025-26',
    });

    const result = await repo.findLatestFeeByStudentId('22CSE001');
    expect(result).toEqual({
      studentId: '22CSE001',
      feeType: 'Exam',
      totalFee: 5000,
      paidAmount: 0,
      remainingAmount: 5000,
      dueDate: expect.any(Date),
      status: 'pending',
      semester: 1,
      academicYear: '2025-26',
    });
  });
});

describe('MongoScheduleRepository', () => {
  const repo = new MongoScheduleRepository();

  it('findScheduleByClass returns schedule sorted by periodNumber', async () => {
    await Schedule.create({
      department: 'CSE',
      year: 4,
      section: 'A',
      dayOfWeek: 'Monday',
      periodNumber: 2,
      timeSlot: '10:00-11:00',
      subject: 'DBMS',
      faculty: 'Dr. Smith',
      room: 'Room 101',
      type: 'lecture',
      semester: 1,
      academicYear: '2025-26',
    });
    await Schedule.create({
      department: 'CSE',
      year: 4,
      section: 'A',
      dayOfWeek: 'Monday',
      periodNumber: 1,
      timeSlot: '09:00-10:00',
      subject: 'OS',
      faculty: 'Dr. Jones',
      room: 'Room 102',
      type: 'lecture',
      semester: 1,
      academicYear: '2025-26',
    });

    const results = await repo.findScheduleByClass({
      department: 'CSE',
      year: 4,
      section: 'A',
      dayOfWeek: 'Monday',
    });
    expect(results).toHaveLength(2);
    expect(results[0].periodNumber).toBe(1);
    expect(results[1].periodNumber).toBe(2);
  });

  it('findScheduleByClass returns empty for mismatched day', async () => {
    await Schedule.create({
      department: 'CSE',
      year: 4,
      section: 'A',
      dayOfWeek: 'Monday',
      periodNumber: 1,
      timeSlot: '09:00-10:00',
      subject: 'DBMS',
      faculty: 'Dr. Smith',
      room: 'Room 101',
      type: 'lecture',
      semester: 1,
      academicYear: '2025-26',
    });

    const results = await repo.findScheduleByClass({
      department: 'CSE',
      year: 4,
      section: 'A',
      dayOfWeek: 'Tuesday',
    });
    expect(results).toHaveLength(0);
  });

  it('findScheduleByClass returns correct record fields', async () => {
    await Schedule.create({
      department: 'CSE',
      year: 3,
      section: 'B',
      dayOfWeek: 'Wednesday',
      periodNumber: 4,
      timeSlot: '14:00-15:00',
      subject: 'Algorithms',
      faculty: 'Dr. Lee',
      room: 'Lab 3',
      type: 'lab',
      semester: 1,
      academicYear: '2025-26',
    });

    const results = await repo.findScheduleByClass({
      department: 'CSE',
      year: 3,
      section: 'B',
      dayOfWeek: 'Wednesday',
    });
    expect(results[0]).toEqual({
      department: 'CSE',
      year: 3,
      section: 'B',
      dayOfWeek: 'Wednesday',
      periodNumber: 4,
      timeSlot: '14:00-15:00',
      subject: 'Algorithms',
      faculty: 'Dr. Lee',
      room: 'Lab 3',
      type: 'lab',
      semester: 1,
      academicYear: '2025-26',
    });
  });
});

describe('MongoResultRepository', () => {
  const repo = new MongoResultRepository();

  it('findStudentResults returns records sorted by subject', async () => {
    await Result.create({
      studentId: '22CSE001',
      semester: 1,
      subject: 'Mathematics',
      marksObtained: 85,
      totalMarks: 100,
      grade: 'A',
      cgpa: 9.0,
      examType: 'final',
      academicYear: '2025-26',
    });
    await Result.create({
      studentId: '22CSE001',
      semester: 1,
      subject: 'Algorithms',
      marksObtained: 92,
      totalMarks: 100,
      grade: 'A+',
      cgpa: 9.5,
      examType: 'final',
      academicYear: '2025-26',
    });

    const results = await repo.findStudentResults('22CSE001');
    expect(results).toHaveLength(2);
    expect(results[0].subject).toBe('Algorithms');
    expect(results[1].subject).toBe('Mathematics');
  });

  it('findStudentResults returns empty for unknown student', async () => {
    const results = await repo.findStudentResults('UNKNOWN');
    expect(results).toHaveLength(0);
  });

  it('findStudentResults returns correct record fields', async () => {
    await Result.create({
      studentId: '22CSE001',
      semester: 1,
      subject: 'Physics',
      marksObtained: 78,
      totalMarks: 100,
      grade: 'B+',
      cgpa: 8.0,
      examType: 'midterm',
      academicYear: '2025-26',
    });

    const results = await repo.findStudentResults('22CSE001');
    expect(results[0]).toEqual({
      studentId: '22CSE001',
      semester: 1,
      subject: 'Physics',
      marksObtained: 78,
      totalMarks: 100,
      grade: 'B+',
      cgpa: 8.0,
    });
  });
});

describe('MongoPublicContentRepository', () => {
  const repo = new MongoPublicContentRepository();

  it('findByCategory returns active content sorted by title', async () => {
    await PublicContent.create({
      category: 'about_hits',
      title: 'B',
      content: 'About B',
      keywords: ['b'],
      isActive: true,
    });
    await PublicContent.create({
      category: 'about_hits',
      title: 'A',
      content: 'About A',
      keywords: ['a'],
      isActive: true,
    });
    await PublicContent.create({
      category: 'about_hits',
      title: 'C',
      content: 'Inactive',
      keywords: ['c'],
      isActive: false,
    });

    const results = await repo.findByCategory('about_hits', true);
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('A');
    expect(results[1].title).toBe('B');
  });

  it('findByCategory returns empty for unknown category', async () => {
    const results = await repo.findByCategory('nonexistent', true);
    expect(results).toHaveLength(0);
  });

  it('searchByTerms finds matching title', async () => {
    await PublicContent.create({
      category: 'departments',
      title: 'Computer Science',
      content: 'CSE department',
      keywords: ['computer', 'science'],
      isActive: true,
    });
    await PublicContent.create({
      category: 'departments',
      title: 'Mechanical',
      content: 'Mechanical department',
      keywords: ['mechanical'],
      isActive: true,
    });

    const results = await repo.searchByTerms(['Computer'], 10);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Computer Science');
  });

  it('searchByTerms finds matching keywords', async () => {
    await PublicContent.create({
      category: 'courses',
      title: 'B.Tech CSE',
      content: 'Four year program',
      keywords: ['btech', 'cse', 'engineering'],
      isActive: true,
    });

    const results = await repo.searchByTerms(['btech'], 10);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('B.Tech CSE');
  });

  it('searchByTerms returns empty for no terms', async () => {
    const results = await repo.searchByTerms([], 10);
    expect(results).toHaveLength(0);
  });

  it('searchByTerms respects limit', async () => {
    for (let i = 0; i < 5; i++) {
      await PublicContent.create({
        category: 'faq',
        title: `Question ${i}`,
        content: `Answer ${i}`,
        keywords: ['faq'],
        isActive: true,
      });
    }

    const results = await repo.searchByTerms(['faq'], 3);
    expect(results).toHaveLength(3);
  });

  it('aggregateCategoryCounts returns counts per category', async () => {
    await PublicContent.create({
      category: 'about_hits',
      title: 'About 1',
      content: 'About 1',
      keywords: [],
      isActive: true,
    });
    await PublicContent.create({
      category: 'about_hits',
      title: 'About 2',
      content: 'About 2',
      keywords: [],
      isActive: true,
    });
    await PublicContent.create({
      category: 'admissions',
      title: 'Admissions',
      content: 'Admissions info',
      keywords: [],
      isActive: true,
    });
    await PublicContent.create({
      category: 'about_hits',
      title: 'Inactive',
      content: 'Inactive',
      keywords: [],
      isActive: false,
    });

    const counts = await repo.aggregateCategoryCounts();
    expect(counts).toHaveLength(2);
    expect(counts.find((c) => c.category === 'about_hits')?.count).toBe(2);
    expect(counts.find((c) => c.category === 'admissions')?.count).toBe(1);
  });
});
