import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { PublicContent } from '../../../src/database/models/PublicContent.js';
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

describe('Public Info API', () => {
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

  describe('GET /api/v1/public-info', () => {
    it('returns all public content entries', async () => {
      await PublicContent.create({
        category: 'about_hits',
        title: 'About HITS',
        content: 'HITS is a deemed university.',
        keywords: ['hits'],
        isActive: true,
      });

      const res = await request(app).get('/api/v1/public-info');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.entries.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.entries[0].category).toBe('about_hits');
    });

    it('filters by category', async () => {
      await PublicContent.create({ category: 'about_hits', title: 'About HITS', content: 'About', keywords: [], isActive: true });
      await PublicContent.create({ category: 'admissions', title: 'Admissions', content: 'Apply now', keywords: [], isActive: true });

      const res = await request(app).get('/api/v1/public-info?category=admissions');

      expect(res.status).toBe(200);
      expect(res.body.data.entries).toHaveLength(1);
      expect(res.body.data.entries[0].category).toBe('admissions');
    });

    it('filters by isActive', async () => {
      await PublicContent.create({ category: 'about_hits', title: 'Active', content: 'Active content', keywords: [], isActive: true });
      await PublicContent.create({ category: 'about_hits', title: 'Inactive', content: 'Inactive content', keywords: [], isActive: false });

      const res = await request(app).get('/api/v1/public-info?isActive=true');

      expect(res.status).toBe(200);
      expect(res.body.data.entries).toHaveLength(1);
      expect(res.body.data.entries[0].title).toBe('Active');
    });
  });

  describe('GET /api/v1/public-info/counts', () => {
    it('returns category counts', async () => {
      await PublicContent.create({ category: 'about_hits', title: 'About', content: 'Info', keywords: [], isActive: true });
      await PublicContent.create({ category: 'about_hits', title: 'About 2', content: 'Info 2', keywords: [], isActive: true });

      const res = await request(app).get('/api/v1/public-info/counts');

      expect(res.status).toBe(200);
      expect(res.body.data.categories).toHaveLength(14);
      const aboutCount = res.body.data.categories.find((c: { category: string; count: number }) => c.category === 'about_hits');
      expect(aboutCount.count).toBe(2);
    });
  });

  describe('GET /api/v1/public-info/search', () => {
    it('searches by keyword', async () => {
      await PublicContent.create({ category: 'about_hits', title: 'HITS Overview', content: 'HITS is a university', keywords: ['hits', 'university'], isActive: true });
      await PublicContent.create({ category: 'admissions', title: 'Apply Now', content: 'Admission process', keywords: ['admission', 'apply'], isActive: true });

      const res = await request(app).get('/api/v1/public-info/search?q=hits');

      expect(res.status).toBe(200);
      expect(res.body.data.entries.length).toBeGreaterThanOrEqual(1);
    });

    it('returns error for empty query', async () => {
      const res = await request(app).get('/api/v1/public-info/search?q=');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/public-info/category/:category', () => {
    it('returns entries for a specific category', async () => {
      await PublicContent.create({ category: 'hostel', title: 'Hostel Info', content: 'Hostel details', keywords: ['hostel'], isActive: true });

      const res = await request(app).get('/api/v1/public-info/category/hostel');

      expect(res.status).toBe(200);
      expect(res.body.data.entries).toHaveLength(1);
      expect(res.body.data.hasData).toBe(true);
    });

    it('returns hasData false for empty category', async () => {
      const res = await request(app).get('/api/v1/public-info/category/faq');

      expect(res.status).toBe(200);
      expect(res.body.data.hasData).toBe(false);
      expect(res.body.data.entries).toHaveLength(0);
    });
  });

  describe('GET /api/v1/public-info/:id', () => {
    it('returns a single entry by id', async () => {
      const entry = await PublicContent.create({ category: 'contact', title: 'Phone', content: '+91 44 2223 0711', keywords: ['phone'], isActive: true });

      const res = await request(app).get(`/api/v1/public-info/${entry._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Phone');
      expect(res.body.data.category).toBe('contact');
    });

    it('returns 404 for non-existent id', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/v1/public-info/${fakeId}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/public-info', () => {
    it('creates a new entry (auth required)', async () => {
      const res = await request(app)
        .post('/api/v1/public-info')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'sports',
          title: 'Cricket Ground',
          content: 'Full-size cricket ground with turf pitch.',
          keywords: ['cricket', 'ground'],
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.category).toBe('sports');
      expect(res.body.data.title).toBe('Cricket Ground');
    });

    it('rejects unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/v1/public-info')
        .send({ category: 'sports', title: 'Test', content: 'Test content' });

      expect(res.status).toBe(401);
    });

    it('rejects invalid category', async () => {
      const res = await request(app)
        .post('/api/v1/public-info')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ category: 'invalid_category', title: 'Test', content: 'Test' });

      expect(res.status).toBe(400);
    });

    it('rejects missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/public-info')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ category: 'sports' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/v1/public-info/:id', () => {
    it('updates an existing entry', async () => {
      const entry = await PublicContent.create({ category: 'faq', title: 'Old Title', content: 'Old content', keywords: [], isActive: true });

      const res = await request(app)
        .put(`/api/v1/public-info/${entry._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'New Title', content: 'Updated content' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('New Title');
      expect(res.body.data.content).toBe('Updated content');
    });

    it('returns 404 for non-existent id', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/v1/public-info/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('rejects unauthenticated requests', async () => {
      const entry = await PublicContent.create({ category: 'faq', title: 'Title', content: 'Content', keywords: [], isActive: true });

      const res = await request(app)
        .put(`/api/v1/public-info/${entry._id}`)
        .send({ title: 'Hacked' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/public-info/:id', () => {
    it('deletes an entry', async () => {
      const entry = await PublicContent.create({ category: 'faq', title: 'To Delete', content: 'Delete me', keywords: [], isActive: true });

      const res = await request(app)
        .delete(`/api/v1/public-info/${entry._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toMatch(/deleted/i);

      const check = await PublicContent.findById(entry._id);
      expect(check).toBeNull();
    });

    it('returns 404 for non-existent id', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/public-info/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('rejects unauthenticated requests', async () => {
      const entry = await PublicContent.create({ category: 'faq', title: 'Title', content: 'Content', keywords: [], isActive: true });

      const res = await request(app).delete(`/api/v1/public-info/${entry._id}`);

      expect(res.status).toBe(401);
    });
  });
});
