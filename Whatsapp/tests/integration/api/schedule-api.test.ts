import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Schedule } from '../../../src/database/models/Schedule.js';
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

describe('Schedule API', () => {
  let studentToken: string;

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
    studentToken = signToken({ userId: String(student._id), username: '22CSE001', role: 'student' });
  });

  describe('GET /api/v1/schedule/day', () => {
    it('returns schedule for a specific day', async () => {
      await Schedule.create({
        department: 'CSE', year: 4, section: 'A', dayOfWeek: 'Monday',
        timeSlot: '09:00-10:00', subject: 'DBMS', room: 'Room 101',
        type: 'lecture', semester: 1, academicYear: '2025-26',
      });
      await Schedule.create({
        department: 'CSE', year: 4, section: 'A', dayOfWeek: 'Monday',
        timeSlot: '10:00-11:00', subject: 'OS', room: 'Room 102',
        type: 'lecture', semester: 1, academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/schedule/day?department=CSE&year=4&section=A&dayOfWeek=Monday')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.entries).toHaveLength(2);
      expect(res.body.data.entries[0].timeSlot).toBe('09:00-10:00');
    });
  });

  describe('GET /api/v1/schedule/week', () => {
    it('returns full week schedule', async () => {
      await Schedule.create({
        department: 'CSE', year: 4, section: 'A', dayOfWeek: 'Monday',
        timeSlot: '09:00-10:00', subject: 'DBMS', room: 'Room 101',
        type: 'lecture', semester: 1, academicYear: '2025-26',
      });
      await Schedule.create({
        department: 'CSE', year: 4, section: 'A', dayOfWeek: 'Tuesday',
        timeSlot: '09:00-10:00', subject: 'OS', room: 'Room 102',
        type: 'lecture', semester: 1, academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/schedule/week?department=CSE&year=4&section=A')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.schedule.Monday).toHaveLength(1);
      expect(res.body.data.schedule.Tuesday).toHaveLength(1);
    });
  });

  describe('POST /api/v1/schedule', () => {
    it('creates a schedule entry', async () => {
      const res = await request(app)
        .post('/api/v1/schedule')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          department: 'CSE', year: 4, section: 'A', dayOfWeek: 'Monday',
          timeSlot: '09:00-10:00', subject: 'DBMS', room: 'Room 101',
          type: 'lecture', semester: 1, academicYear: '2025-26',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.subject).toBe('DBMS');
    });
  });

  describe('POST /api/v1/schedule/bulk', () => {
    it('creates multiple schedule entries', async () => {
      const res = await request(app)
        .post('/api/v1/schedule/bulk')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          schedules: [
            { department: 'CSE', year: 4, section: 'A', dayOfWeek: 'Monday', timeSlot: '09:00-10:00', subject: 'DBMS', room: 'R1', type: 'lecture', semester: 1, academicYear: '2025-26' },
            { department: 'CSE', year: 4, section: 'A', dayOfWeek: 'Monday', timeSlot: '10:00-11:00', subject: 'OS', room: 'R2', type: 'lab', semester: 1, academicYear: '2025-26' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.created).toBe(2);
    });
  });

  describe('DELETE /api/v1/schedule/day', () => {
    it('deletes schedule for a day', async () => {
      await Schedule.create({
        department: 'CSE', year: 4, section: 'A', dayOfWeek: 'Monday',
        timeSlot: '09:00-10:00', subject: 'DBMS', room: 'Room 101',
        type: 'lecture', semester: 1, academicYear: '2025-26',
      });

      const res = await request(app)
        .delete('/api/v1/schedule/day?department=CSE&year=4&section=A&dayOfWeek=Monday')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(1);
    });
  });
});
