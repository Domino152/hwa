import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Subject } from '../../../src/database/models/Subject.js';
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

describe('Subjects API', () => {
  let adminToken: string;

  beforeEach(async () => {
    const admin = await User.create({
      fullName: 'Admin User',
      username: 'admin1',
      passwordHash: '$2b$10$hashedpw',
      role: 'student',
      studentId: 'ADMIN1',
      whatsappNumber: null,
      department: 'CSE',
      year: 1,
      section: 'A',
    });
    adminToken = signToken({ userId: String(admin._id), username: 'admin1', role: 'student' });
  });

  describe('GET /api/v1/subjects', () => {
    it('returns all subjects', async () => {
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4, type: 'theory',
      });
      await Subject.create({
        code: 'CS402', name: 'OS', department: 'CSE', semester: 7, credits: 4, type: 'theory',
      });

      const res = await request(app).get('/api/v1/subjects');

      expect(res.status).toBe(200);
      expect(res.body.data.subjects).toHaveLength(2);
    });

    it('filters by department', async () => {
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4, type: 'theory',
      });
      await Subject.create({
        code: 'EC401', name: 'Signals', department: 'ECE', semester: 7, credits: 4, type: 'theory',
      });

      const res = await request(app).get('/api/v1/subjects?department=CSE');

      expect(res.status).toBe(200);
      expect(res.body.data.subjects).toHaveLength(1);
      expect(res.body.data.subjects[0].code).toBe('CS401');
    });

    it('searches by name', async () => {
      await Subject.create({
        code: 'CS401', name: 'Database Systems', department: 'CSE', semester: 7, credits: 4, type: 'theory',
      });

      const res = await request(app).get('/api/v1/subjects?search=database');

      expect(res.status).toBe(200);
      expect(res.body.data.subjects).toHaveLength(1);
    });
  });

  describe('GET /api/v1/subjects/code/:code', () => {
    it('returns subject by code', async () => {
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4, type: 'theory',
      });

      const res = await request(app).get('/api/v1/subjects/code/CS401');

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('DBMS');
    });

    it('returns 404 for unknown code', async () => {
      const res = await request(app).get('/api/v1/subjects/code/UNKNOWN');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/subjects', () => {
    it('creates a subject', async () => {
      const res = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4, type: 'theory',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('CS401');
    });

    it('rejects duplicate code', async () => {
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4, type: 'theory',
      });

      const res = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'CS401', name: 'DBMS 2', department: 'CSE', semester: 7, credits: 4, type: 'theory',
        });

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/v1/subjects/:id', () => {
    it('updates a subject', async () => {
      const subject = await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4, type: 'theory',
      });

      const res = await request(app)
        .put(`/api/v1/subjects/${subject._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Database Management Systems' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Database Management Systems');
    });
  });

  describe('DELETE /api/v1/subjects/:id', () => {
    it('deletes a subject', async () => {
      const subject = await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4, type: 'theory',
      });

      const res = await request(app)
        .delete(`/api/v1/subjects/${subject._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const check = await Subject.findById(subject._id);
      expect(check).toBeNull();
    });
  });
});
