import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import bcrypt from 'bcrypt';
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

describe('Full Auth Flow', () => {
  const password = 'student123';
  let passwordHash: string;

  beforeEach(async () => {
    passwordHash = await bcrypt.hash(password, 4);
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 400 for empty body', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: '22CSE001', role: 'student' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: '22CSE001', password: 'student123', role: 'admin' });
      expect(res.status).toBe(400);
    });

    it('returns 401 for wrong credentials', async () => {
      await User.create({
        fullName: 'Arjun Sharma',
        username: '22CSE001',
        passwordHash,
        role: 'student',
        studentId: '22CSE001',
        whatsappNumber: null,
        department: 'CSE',
        year: 4,
        section: 'A',
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: '22CSE001', password: 'wrongpass', role: 'student' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 with token for valid credentials', async () => {
      await User.create({
        fullName: 'Arjun Sharma',
        username: '22CSE001',
        passwordHash,
        role: 'student',
        studentId: '22CSE001',
        whatsappNumber: '917530063885',
        department: 'CSE',
        year: 4,
        section: 'A',
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: '22CSE001', password, role: 'student' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.username).toBe('22CSE001');
      expect(res.body.data.user.role).toBe('student');
    });

    it('returns 401 for inactive user', async () => {
      await User.create({
        fullName: 'Inactive User',
        username: 'INACTIVE1',
        passwordHash,
        role: 'student',
        studentId: 'INACTIVE1',
        whatsappNumber: null,
        department: 'CSE',
        year: 1,
        section: 'A',
        isActive: false,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'INACTIVE1', password, role: 'student' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });

    it('returns 200 with user for valid token', async () => {
      const user = await User.create({
        fullName: 'Arjun Sharma',
        username: '22CSE001',
        passwordHash,
        role: 'student',
        studentId: '22CSE001',
        whatsappNumber: null,
        department: 'CSE',
        year: 4,
        section: 'A',
      });

      const token = signToken({
        userId: String(user._id),
        username: '22CSE001',
        role: 'student',
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe('22CSE001');
      expect(res.body.data.fullName).toBe('Arjun Sharma');
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('returns 401 for deleted user', async () => {
      const token = signToken({
        userId: new mongoose.Types.ObjectId().toString(),
        username: 'deleted',
        role: 'student',
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/link-whatsapp', () => {
    it('returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/link-whatsapp')
        .send({ phone: '917530063885' });
      expect(res.status).toBe(401);
    });

    it('links phone number to authenticated user', async () => {
      const user = await User.create({
        fullName: 'Arjun Sharma',
        username: '22CSE001',
        passwordHash,
        role: 'student',
        studentId: '22CSE001',
        whatsappNumber: null,
        department: 'CSE',
        year: 4,
        section: 'A',
      });

      const token = signToken({
        userId: String(user._id),
        username: '22CSE001',
        role: 'student',
      });

      const res = await request(app)
        .post('/api/v1/auth/link-whatsapp')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '917530063885' });
      expect(res.status).toBe(200);
      expect(res.body.data.whatsappNumber).toBe('917530063885');
    });

    it('returns 409 when phone is already linked to another account', async () => {
      const user1 = await User.create({
        fullName: 'User One',
        username: 'USER1',
        passwordHash,
        role: 'student',
        studentId: 'USER1',
        whatsappNumber: '917530063885',
        department: 'CSE',
        year: 1,
        section: 'A',
      });

      const user2 = await User.create({
        fullName: 'User Two',
        username: 'USER2',
        passwordHash,
        role: 'student',
        studentId: 'USER2',
        whatsappNumber: null,
        department: 'CSE',
        year: 1,
        section: 'A',
      });

      const token = signToken({
        userId: String(user2._id),
        username: 'USER2',
        role: 'student',
      });

      const res = await request(app)
        .post('/api/v1/auth/link-whatsapp')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '917530063885' });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/auth/status', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/status');
      expect(res.status).toBe(401);
    });

    it('returns linked: false when no phone', async () => {
      const user = await User.create({
        fullName: 'Arjun Sharma',
        username: '22CSE001',
        passwordHash,
        role: 'student',
        studentId: '22CSE001',
        whatsappNumber: null,
        department: 'CSE',
        year: 4,
        section: 'A',
      });

      const token = signToken({
        userId: String(user._id),
        username: '22CSE001',
        role: 'student',
      });

      const res = await request(app)
        .get('/api/v1/auth/status')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.linked).toBe(false);
    });

    it('returns linked: true with phone when linked', async () => {
      const user = await User.create({
        fullName: 'Arjun Sharma',
        username: '22CSE001',
        passwordHash,
        role: 'student',
        studentId: '22CSE001',
        whatsappNumber: '917530063885',
        department: 'CSE',
        year: 4,
        section: 'A',
      });

      const token = signToken({
        userId: String(user._id),
        username: '22CSE001',
        role: 'student',
      });

      const res = await request(app)
        .get('/api/v1/auth/status')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.linked).toBe(true);
      expect(res.body.data.phone).toBe('917530063885');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(401);
    });

    it('unlinks whatsapp on logout', async () => {
      const user = await User.create({
        fullName: 'Arjun Sharma',
        username: '22CSE001',
        passwordHash,
        role: 'student',
        studentId: '22CSE001',
        whatsappNumber: '917530063885',
        department: 'CSE',
        year: 4,
        section: 'A',
      });

      const token = signToken({
        userId: String(user._id),
        username: '22CSE001',
        role: 'student',
      });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser!.whatsappNumber).toBeNull();
    });
  });
});
