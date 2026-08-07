import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Attendance } from '../../../src/database/models/Attendance.js';
import { signToken } from '../../../src/modules/auth/token.service.js';

let mongo: MongoMemoryServer;

vi.mock('../../../src/modules/whatsapp/chat.service.js', () => ({
  ChatService: vi.fn().mockImplementation(() => ({
    getQR: vi.fn().mockReturnValue(null),
    getStatus: vi.fn().mockReturnValue({ state: 'close' }),
    isConnected: vi.fn().mockReturnValue(false),
    sendMessage: vi.fn().mockResolvedValue({ messageId: 'mock-msg-id' }),
    logout: vi.fn().mockResolvedValue(undefined),
    setInboxService: vi.fn(),
  })),
}));

vi.mock('../../../src/modules/whatsapp/inbox.service.js', () => ({
  InboxService: vi.fn().mockImplementation(() => ({
    getConversations: vi.fn().mockResolvedValue({ conversations: [], total: 0, page: 1, limit: 20 }),
    getMessages: vi.fn().mockResolvedValue({ messages: [], total: 0, page: 1, limit: 20 }),
  })),
}));

vi.mock('../../../src/sockets/index.js', () => ({
  emitToAll: vi.fn(),
  emitIncomingMessage: vi.fn(),
}));

let app: ReturnType<typeof import('../../../src/app.js').createApp>;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const { createApp } = await import('../../../src/app.js');
  app = createApp();
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
  vi.clearAllMocks();
});

describe('Attendance API', () => {
  let studentToken: string;
  let userId: string;

  beforeEach(async () => {
    const student = await User.create({
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
    userId = String(student._id);
    studentToken = signToken({ userId, username: '22CSE001', role: 'student' });
  });

  describe('GET /api/v1/attendance/student/:studentId', () => {
    it('returns attendance records for a student', async () => {
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
        subject: 'DBMS',
        totalClasses: 48,
        attendedClasses: 40,
        percentage: 83,
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/student/22CSE001')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.records).toHaveLength(2);
      expect(res.body.data.summary.overallPercentage).toBeGreaterThan(0);
      expect(res.body.data.hasData).toBe(true);
    });

    it('returns empty for unknown student', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/student/UNKNOWN')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasData).toBe(false);
    });

    it('requires authentication', async () => {
      const res = await request(app).get('/api/v1/attendance/student/22CSE001');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/attendance/student/:studentId/subject/:subject', () => {
    it('returns specific subject attendance', async () => {
      await Attendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        totalClasses: 50,
        attendedClasses: 45,
        percentage: 90,
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/student/22CSE001/subject/Mathematics')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.record).not.toBeNull();
      expect(res.body.data.record.subject).toBe('Mathematics');
    });
  });

  describe('POST /api/v1/attendance', () => {
    it('creates an attendance record', async () => {
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          subject: 'Physics',
          totalClasses: 40,
          attendedClasses: 38,
          semester: 1,
          academicYear: '2025-26',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subject).toBe('Physics');
      expect(res.body.data.percentage).toBe(95);
    });

    it('rejects invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ studentId: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/attendance/bulk', () => {
    it('creates multiple attendance records', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          records: [
            { studentId: '22CSE001', subject: 'Math', totalClasses: 50, attendedClasses: 45, semester: 1, academicYear: '2025-26' },
            { studentId: '22CSE001', subject: 'Science', totalClasses: 40, attendedClasses: 38, semester: 1, academicYear: '2025-26' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.created).toBe(2);
    });
  });

  describe('PUT /api/v1/attendance/student/:studentId/subject/:subject', () => {
    it('updates an existing attendance record', async () => {
      await Attendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        totalClasses: 50,
        attendedClasses: 40,
        percentage: 80,
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .put('/api/v1/attendance/student/22CSE001/subject/Mathematics?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ attendedClasses: 48 });

      expect(res.status).toBe(200);
      expect(res.body.data.percentage).toBe(96);
    });
  });
});
