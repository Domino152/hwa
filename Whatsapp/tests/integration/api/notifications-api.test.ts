import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Notification } from '../../../src/database/models/Notification.js';
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

describe('Notifications API', () => {
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

  describe('GET /api/v1/notifications', () => {
    it('returns empty list when no notifications exist', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toEqual([]);
      expect(res.body.data.total).toBe(0);
    });

    it('returns notifications with pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await Notification.create({
          type: 'general_announcement',
          recipient: { userId, studentId: '22CSE001', role: 'student', phone: '917530063885' },
          message: { title: `Title ${i}`, body: `Body ${i}` },
          status: 'sent',
          priority: 'normal',
        });
      }

      const res = await request(app)
        .get('/api/v1/notifications?page=1&limit=2')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notifications).toHaveLength(2);
      expect(res.body.data.total).toBe(5);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(2);
    });

    it('filters by studentId', async () => {
      await Notification.create({
        type: 'general_announcement',
        recipient: { userId, studentId: '22CSE001', role: 'student', phone: '917530063885' },
        message: { title: 'For me', body: 'Body' },
        status: 'sent',
        priority: 'normal',
      });
      await Notification.create({
        type: 'general_announcement',
        recipient: { userId, studentId: 'OTHER', role: 'student', phone: null },
        message: { title: 'Not for me', body: 'Body' },
        status: 'sent',
        priority: 'normal',
      });

      const res = await request(app)
        .get('/api/v1/notifications?studentId=22CSE001')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.notifications[0].recipient.studentId).toBe('22CSE001');
    });

    it('filters by status', async () => {
      await Notification.create({
        type: 'general_announcement',
        recipient: { userId, studentId: '22CSE001', role: 'student', phone: null },
        message: { title: 'Pending', body: 'Body' },
        status: 'pending',
        priority: 'normal',
      });
      await Notification.create({
        type: 'general_announcement',
        recipient: { userId, studentId: '22CSE001', role: 'student', phone: null },
        message: { title: 'Sent', body: 'Body' },
        status: 'sent',
        priority: 'normal',
      });

      const res = await request(app)
        .get('/api/v1/notifications?status=pending')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
    });

    it('returns empty list for unauthenticated request (routes are public)', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/notifications/stats', () => {
    it('returns notification statistics', async () => {
      await Notification.create({
        type: 'general_announcement',
        recipient: { userId, studentId: '22CSE001', role: 'student', phone: null },
        message: { title: 'T1', body: 'B1' },
        status: 'sent',
        priority: 'normal',
      });
      await Notification.create({
        type: 'attendance_alert',
        recipient: { userId, studentId: '22CSE001', role: 'student', phone: null },
        message: { title: 'T2', body: 'B2' },
        status: 'pending',
        priority: 'high',
      });

      const res = await request(app)
        .get('/api/v1/notifications/stats')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.byStatus.sent).toBe(1);
      expect(res.body.data.byStatus.pending).toBe(1);
      expect(res.body.data.byType.general_announcement).toBe(1);
      expect(res.body.data.byType.attendance_alert).toBe(1);
    });
  });

  describe('GET /api/v1/notifications/queue/status', () => {
    it('returns queue status', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/queue/status')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('pending');
      expect(res.body.data).toHaveProperty('queued');
      expect(res.body.data).toHaveProperty('sent');
      expect(res.body.data).toHaveProperty('failed');
      expect(res.body.data).toHaveProperty('processing');
    });
  });

  describe('GET /api/v1/notifications/:id', () => {
    it('returns notification by id', async () => {
      const notif = await Notification.create({
        type: 'fee_reminder',
        recipient: { userId, studentId: '22CSE001', role: 'student', phone: '917530063885' },
        message: { title: 'Fee Due', body: 'Pay now', subject: 'Tuition' },
        status: 'pending',
        priority: 'urgent',
      });

      const res = await request(app)
        .get(`/api/v1/notifications/${notif._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('fee_reminder');
      expect(res.body.data.priority).toBe('urgent');
      expect(res.body.data.message.title).toBe('Fee Due');
    });

    it('returns 404 for nonexistent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/notifications/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });
  });
});
