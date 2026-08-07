import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Fee } from '../../../src/database/models/Fee.js';
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

describe('Fees API', () => {
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

  describe('GET /api/v1/fees/student/:studentId', () => {
    it('returns latest fee for a student', async () => {
      await Fee.create({
        studentId: '22CSE001',
        feeType: 'Tuition',
        totalFee: 100000,
        paidAmount: 50000,
        remainingAmount: 50000,
        dueDate: new Date('2025-12-01'),
        status: 'partial',
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/fees/student/22CSE001')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.fee).not.toBeNull();
      expect(res.body.data.fee.feeType).toBe('Tuition');
      expect(res.body.data.hasData).toBe(true);
    });

    it('returns null for student with no fees', async () => {
      const res = await request(app)
        .get('/api/v1/fees/student/UNKNOWN')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasData).toBe(false);
    });
  });

  describe('GET /api/v1/fees/student/:studentId/all', () => {
    it('returns all fee records for a student', async () => {
      await Fee.create({
        studentId: '22CSE001', feeType: 'Tuition', totalFee: 100000, paidAmount: 100000, remainingAmount: 0,
        dueDate: new Date('2025-06-01'), status: 'paid', semester: 1, academicYear: '2024-25',
      });
      await Fee.create({
        studentId: '22CSE001', feeType: 'Hostel', totalFee: 80000, paidAmount: 40000, remainingAmount: 40000,
        dueDate: new Date('2025-12-01'), status: 'partial', semester: 1, academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/fees/student/22CSE001/all')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.fees).toHaveLength(2);
    });
  });

  describe('PUT /api/v1/fees/student/:studentId/payment', () => {
    it('updates payment for a fee record', async () => {
      await Fee.create({
        studentId: '22CSE001', feeType: 'Tuition', totalFee: 100000, paidAmount: 0, remainingAmount: 100000,
        dueDate: new Date('2025-12-01'), status: 'pending', semester: 1, academicYear: '2025-26',
      });

      const res = await request(app)
        .put('/api/v1/fees/student/22CSE001/payment?feeType=Tuition&semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ paidAmount: 50000 });

      expect(res.status).toBe(200);
      expect(res.body.data.fee).not.toBeNull();
    });
  });

  describe('GET /api/v1/fees/overdue', () => {
    it('returns overdue fees', async () => {
      await Fee.create({
        studentId: '22CSE001', feeType: 'Exam', totalFee: 5000, paidAmount: 0, remainingAmount: 5000,
        dueDate: new Date('2025-01-01'), status: 'pending', semester: 1, academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/fees/overdue?academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.fees).toBeDefined();
    });
  });
});
