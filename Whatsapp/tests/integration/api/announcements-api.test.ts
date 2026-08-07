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

  describe('CRUD', () => {
    it('creates an announcement with all new fields', async () => {
      const res = await request(app)
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Semester Exam Notice',
          content: 'Semester exams starting from next week',
          category: 'college',
          audience: 'students',
          semester: 4,
          academicYear: '2025-26',
          priority: 'high',
          attachments: [{ url: 'https://example.com/schedule.pdf', name: 'Schedule', type: 'application/pdf' }],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Semester Exam Notice');
      expect(res.body.data.category).toBe('college');
      expect(res.body.data.semester).toBe(4);
      expect(res.body.data.academicYear).toBe('2025-26');
      expect(res.body.data.priority).toBe('high');
      expect(res.body.data.attachments).toHaveLength(1);
      expect(res.body.data.attachments[0].name).toBe('Schedule');
      expect(res.body.data.isActive).toBe(true);
    });

    it('creates a department announcement', async () => {
      const res = await request(app)
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'CSE Workshop',
          content: 'AI workshop for CSE students',
          category: 'department',
          audience: 'department',
          department: 'CSE',
          targetSemesters: [3, 4],
          priority: 'urgent',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.department).toBe('CSE');
      expect(res.body.data.targetSemesters).toEqual([3, 4]);
    });

    it('rejects department announcement without department', async () => {
      const res = await request(app)
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Bad',
          content: 'Bad',
          category: 'department',
          audience: 'department',
        });

      expect(res.status).toBe(400);
    });

    it('rejects announcement with invalid expiry', async () => {
      const res = await request(app)
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Bad',
          content: 'Bad',
          category: 'college',
          audience: 'all',
          publishedAt: new Date('2025-06-01').toISOString(),
          expiresAt: new Date('2025-05-01').toISOString(),
        });

      expect(res.status).toBe(400);
    });

    it('gets an announcement by id', async () => {
      const ann = await Announcement.create({
        title: 'Test', content: 'Test', category: 'college',
        audience: 'all', priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
        semester: 4, academicYear: '2025-26',
        attachments: [{ url: 'https://example.com/a.pdf', name: 'File', type: 'pdf' }],
      });

      const res = await request(app).get(`/api/v1/announcements/${String(ann._id)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Test');
      expect(res.body.data.attachments).toHaveLength(1);
      expect(res.body.data.semester).toBe(4);
    });

    it('updates an announcement', async () => {
      const ann = await Announcement.create({
        title: 'Old', content: 'Content', category: 'college',
        audience: 'all', priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });

      const res = await request(app)
        .put(`/api/v1/announcements/${String(ann._id)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'New', priority: 'urgent', semester: 6 });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('New');
      expect(res.body.data.priority).toBe('urgent');
      expect(res.body.data.semester).toBe(6);
    });

    it('publishes and unpublishes', async () => {
      const ann = await Announcement.create({
        title: 'Draft', content: 'Content', category: 'college',
        audience: 'all', priority: 'normal', isActive: false,
        createdBy: 'admin',
      });

      const pub = await request(app)
        .post(`/api/v1/announcements/${String(ann._id)}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pub.body.data.isActive).toBe(true);

      const unpub = await request(app)
        .post(`/api/v1/announcements/${String(ann._id)}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(unpub.body.data.isActive).toBe(false);
    });

    it('deletes an announcement', async () => {
      const ann = await Announcement.create({
        title: 'Del', content: 'Content', category: 'college',
        audience: 'all', priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });

      const res = await request(app)
        .delete(`/api/v1/announcements/${String(ann._id)}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const check = await Announcement.findById(ann._id);
      expect(check).toBeNull();
    });

    it('returns 404 for missing announcement', async () => {
      const res = await request(app).get('/api/v1/announcements/507f1f77bcf86cd799439099');
      expect(res.status).toBe(404);
    });
  });

  describe('Queries', () => {
    it('filters by audience and category', async () => {
      await Announcement.create({
        title: 'All', content: 'C', category: 'college', audience: 'all',
        priority: 'normal', isActive: true, publishedAt: new Date(), createdBy: 'admin',
      });
      await Announcement.create({
        title: 'Students', content: 'C', category: 'college', audience: 'students',
        priority: 'normal', isActive: true, publishedAt: new Date(), createdBy: 'admin',
      });
      await Announcement.create({
        title: 'Dept', content: 'C', category: 'department', audience: 'department',
        department: 'CSE', priority: 'normal', isActive: true, publishedAt: new Date(), createdBy: 'admin',
      });

      const all = await request(app).get('/api/v1/announcements');
      expect(all.body.data.announcements).toHaveLength(3);

      const students = await request(app).get('/api/v1/announcements?audience=students');
      expect(students.body.data.announcements).toHaveLength(2);

      const dept = await request(app).get('/api/v1/announcements?category=department');
      expect(dept.body.data.announcements).toHaveLength(1);
    });

    it('filters by semester and academic year', async () => {
      await Announcement.create({
        title: 'Sem4', content: 'C', category: 'college', audience: 'all',
        semester: 4, academicYear: '2025-26', priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });
      await Announcement.create({
        title: 'Sem6', content: 'C', category: 'college', audience: 'all',
        semester: 6, academicYear: '2025-26', priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });
      await Announcement.create({
        title: 'NoSem', content: 'C', category: 'college', audience: 'all',
        semester: null, academicYear: null, priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });

      const res = await request(app).get('/api/v1/announcements?semester=4&academicYear=2025-26');
      expect(res.body.data.announcements.length).toBeGreaterThanOrEqual(2);
    });

    it('gets announcements by department', async () => {
      await Announcement.create({
        title: 'CSE', content: 'C', category: 'department', audience: 'department',
        department: 'CSE', priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });

      const res = await request(app).get('/api/v1/announcements/department/CSE');
      expect(res.body.data.announcements).toHaveLength(1);
    });

    it('gets announcements by semester', async () => {
      await Announcement.create({
        title: 'Sem4', content: 'C', category: 'college', audience: 'all',
        semester: 4, academicYear: '2025-26', priority: 'normal', isActive: true,
        publishedAt: new Date(), createdBy: 'admin',
      });

      const res = await request(app).get('/api/v1/announcements/semester/4?academicYear=2025-26');
      expect(res.body.data.announcements).toHaveLength(1);
    });

    it('gets expired announcements', async () => {
      await Announcement.create({
        title: 'Expired', content: 'C', category: 'college', audience: 'all',
        priority: 'normal', isActive: true, createdBy: 'admin',
        expiresAt: new Date('2024-01-01'),
      });

      const res = await request(app)
        .get('/api/v1/announcements/expired')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.body.data.announcements).toHaveLength(1);
    });

    it('gets active count', async () => {
      await Announcement.create({
        title: 'A1', content: 'C', category: 'college', audience: 'all',
        priority: 'normal', isActive: true, publishedAt: new Date(), createdBy: 'admin',
      });
      await Announcement.create({
        title: 'A2', content: 'C', category: 'college', audience: 'all',
        priority: 'normal', isActive: false, createdBy: 'admin',
      });

      const res = await request(app)
        .get('/api/v1/announcements/count')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.body.data.count).toBe(1);
    });

    it('paginates results', async () => {
      for (let i = 0; i < 5; i++) {
        await Announcement.create({
          title: `Ann ${i}`, content: 'C', category: 'college', audience: 'all',
          priority: 'normal', isActive: true, publishedAt: new Date(), createdBy: 'admin',
        });
      }

      const page1 = await request(app).get('/api/v1/announcements?page=1&limit=2');
      expect(page1.body.data.announcements).toHaveLength(2);
      expect(page1.body.data.total).toBe(5);

      const page2 = await request(app).get('/api/v1/announcements?page=2&limit=2');
      expect(page2.body.data.announcements).toHaveLength(2);
    });
  });

  describe('Auth', () => {
    it('rejects unauthenticated create', async () => {
      const res = await request(app)
        .post('/api/v1/announcements')
        .send({ title: 'T', content: 'C', audience: 'all' });
      expect(res.status).toBe(401);
    });

    it('allows unauthenticated read', async () => {
      const res = await request(app).get('/api/v1/announcements');
      expect(res.status).toBe(200);
    });
  });
});
