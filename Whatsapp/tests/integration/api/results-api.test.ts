import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Result } from '../../../src/database/models/Result.js';
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

describe('Results API', () => {
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

  describe('GET /api/v1/results/student/:studentId', () => {
    it('returns results for a student', async () => {
      await Result.create({
        studentId: '22CSE001', semester: 1, subject: 'Mathematics',
        marksObtained: 85, totalMarks: 100, grade: 'A', cgpa: 9.0,
        examType: 'final', academicYear: '2025-26',
      });
      await Result.create({
        studentId: '22CSE001', semester: 1, subject: 'DBMS',
        marksObtained: 92, totalMarks: 100, grade: 'A+', cgpa: 9.5,
        examType: 'final', academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/results/student/22CSE001')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(2);
      expect(res.body.data.cgpa).toBe(9.5);
      expect(res.body.data.hasData).toBe(true);
    });

    it('returns empty for unknown student', async () => {
      const res = await request(app)
        .get('/api/v1/results/student/UNKNOWN')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasData).toBe(false);
    });
  });

  describe('GET /api/v1/results/student/:studentId/cgpa', () => {
    it('returns CGPA for a student', async () => {
      await Result.create({
        studentId: '22CSE001', semester: 1, subject: 'Math',
        marksObtained: 85, totalMarks: 100, grade: 'A', cgpa: 9.0,
        examType: 'final', academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/results/student/22CSE001/cgpa')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.cgpa).toBe(9.0);
    });
  });

  describe('POST /api/v1/results', () => {
    it('creates a result record', async () => {
      const res = await request(app)
        .post('/api/v1/results')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001', semester: 1, subject: 'Physics',
          marksObtained: 78, totalMarks: 100, grade: 'B+', cgpa: 8.0,
          examType: 'midterm', academicYear: '2025-26',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.subject).toBe('Physics');
    });
  });

  describe('POST /api/v1/results/bulk', () => {
    it('creates multiple result records', async () => {
      const res = await request(app)
        .post('/api/v1/results/bulk')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          results: [
            { studentId: '22CSE001', semester: 1, subject: 'Math', marksObtained: 85, totalMarks: 100, grade: 'A', cgpa: 9.0, examType: 'final', academicYear: '2025-26' },
            { studentId: '22CSE001', semester: 1, subject: 'Science', marksObtained: 90, totalMarks: 100, grade: 'A+', cgpa: 9.5, examType: 'final', academicYear: '2025-26' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.created).toBe(2);
    });
  });
});
