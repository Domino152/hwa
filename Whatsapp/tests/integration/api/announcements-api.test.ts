import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Announcement } from '../../../src/database/models/Announcement.js';
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

describe('Announcements API', () => {
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

  describe('GET /api/v1/announcements', () => {
    it('returns active announcements', async () => {
      await Announcement.create({
        title: 'Holiday Notice', content: 'College closed tomorrow',
        audience: 'all', priority: 'high', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });
      await Announcement.create({
        title: 'CSE Meeting', content: 'Department meeting',
        audience: 'department', department: 'CSE', priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });

      const res = await request(app).get('/api/v1/announcements');

      expect(res.status).toBe(200);
      expect(res.body.data.announcements).toHaveLength(2);
    });

    it('filters by audience', async () => {
      await Announcement.create({
        title: 'For Students', content: 'Student notice',
        audience: 'students', priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });
      await Announcement.create({
        title: 'For Parents', content: 'Parent notice',
        audience: 'parents', priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });

      const res = await request(app).get('/api/v1/announcements?audience=students');

      expect(res.status).toBe(200);
      expect(res.body.data.announcements).toHaveLength(1);
      expect(res.body.data.announcements[0].title).toBe('For Students');
    });
  });

  describe('GET /api/v1/announcements/department/:department', () => {
    it('returns announcements for a department', async () => {
      await Announcement.create({
        title: 'CSE Notice', content: 'Department event',
        audience: 'department', department: 'CSE', priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });

      const res = await request(app).get('/api/v1/announcements/department/CSE');

      expect(res.status).toBe(200);
      expect(res.body.data.announcements).toHaveLength(1);
    });
  });

  describe('POST /api/v1/announcements', () => {
    it('creates an announcement', async () => {
      const res = await request(app)
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'New Event', content: 'Annual day celebration',
          audience: 'all', priority: 'normal',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('New Event');
      expect(res.body.data.isActive).toBe(true);
    });
  });

  describe('PUT /api/v1/announcements/:id', () => {
    it('updates an announcement', async () => {
      const ann = await Announcement.create({
        title: 'Old Title', content: 'Content',
        audience: 'all', priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });

      const res = await request(app)
        .put(`/api/v1/announcements/${ann._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('New Title');
    });
  });

  describe('POST /api/v1/announcements/:id/publish', () => {
    it('publishes an announcement', async () => {
      const ann = await Announcement.create({
        title: 'Draft', content: 'Content',
        audience: 'all', priority: 'normal', isActive: false,
        createdBy: 'admin',
      });

      const res = await request(app)
        .post(`/api/v1/announcements/${ann._id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(true);
    });
  });

  describe('DELETE /api/v1/announcements/:id', () => {
    it('deletes an announcement', async () => {
      const ann = await Announcement.create({
        title: 'To Delete', content: 'Content',
        audience: 'all', priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });

      const res = await request(app)
        .delete(`/api/v1/announcements/${ann._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const check = await Announcement.findById(ann._id);
      expect(check).toBeNull();
    });
  });
});
