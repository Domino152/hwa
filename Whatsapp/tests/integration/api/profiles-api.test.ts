import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
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

describe('Students API', () => {
  let studentToken: string;
  let parentToken: string;

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

    const parent = await User.create({
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
    parentToken = signToken({ userId: String(parent._id), username: 'P22CSE001', role: 'parent' });
  });

  describe('GET /api/v1/students/phone/:phone', () => {
    it('returns student by phone number', async () => {
      const res = await request(app)
        .get('/api/v1/students/phone/917530063885')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.studentId).toBe('22CSE001');
    });

    it('returns 404 for unknown phone', async () => {
      const res = await request(app)
        .get('/api/v1/students/phone/999999999999')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/students/:studentId/profile', () => {
    it('returns student profile', async () => {
      const res = await request(app)
        .get('/api/v1/students/22CSE001/profile')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.student.studentId).toBe('22CSE001');
      expect(res.body.data.hasData).toBe(true);
    });
  });

  describe('GET /api/v1/students/search', () => {
    it('searches students by class', async () => {
      const res = await request(app)
        .get('/api/v1/students/search?department=CSE&year=4&section=A')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students).toHaveLength(1);
    });
  });
});

describe('Parents API', () => {
  let parentToken: string;
  let studentId: string;

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
    studentId = String(student._id);

    const parent = await User.create({
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
    parentToken = signToken({ userId: String(parent._id), username: 'P22CSE001', role: 'parent' });
  });

  describe('GET /api/v1/parents/linked-students', () => {
    it('returns linked students for parent', async () => {
      const res = await request(app)
        .get('/api/v1/parents/linked-students')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students).toHaveLength(1);
      expect(res.body.data.students[0].studentId).toBe('22CSE001');
    });
  });

  describe('GET /api/v1/parents/student/:studentId', () => {
    it('returns student profile for linked parent', async () => {
      const res = await request(app)
        .get('/api/v1/parents/student/22CSE001')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.student.studentId).toBe('22CSE001');
      expect(res.body.data.parent.fullName).toBe('Raj Parent');
    });

    it('rejects access to unlinked student', async () => {
      const res = await request(app)
        .get('/api/v1/parents/student/OTHER')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });
  });
});
