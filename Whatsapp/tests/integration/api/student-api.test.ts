import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Student } from '../../../src/database/models/Student.js';
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

describe('Student API', () => {
  let adminToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = await User.create({
      fullName: 'Admin User',
      username: 'admin',
      passwordHash: '$2b$10$hashedpw',
      role: 'student',
      studentId: 'ADMIN001',
      whatsappNumber: '917530063885',
      department: 'CSE',
      year: 4,
      section: 'A',
    });
    userId = String(user._id);
    adminToken = signToken({ userId, username: 'admin', role: 'student' });
  });

  const createTestStudent = async (overrides: Record<string, unknown> = {}) => {
    return Student.create({
      userId,
      studentId: '22CSE001',
      registerNumber: 'REG2022001',
      rollNumber: 'R001',
      fullName: 'John Doe',
      email: 'john@hits.edu',
      phone: '9876543210',
      gender: 'male',
      dateOfBirth: new Date('2000-01-15'),
      department: 'CSE',
      program: 'B.Tech',
      semester: 4,
      section: 'A',
      batch: '2022-2026',
      advisor: 'Dr. Smith',
      whatsappNumber: '9876543210',
      status: 'active',
      isActive: true,
      ...overrides,
    });
  };

  describe('GET /api/v1/students', () => {
    it('returns paginated students', async () => {
      await createTestStudent();

      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('filters by department', async () => {
      await createTestStudent({ department: 'CSE' });
      await createTestStudent({ studentId: '22ECE001', registerNumber: 'REG2022002', email: 'jane@hits.edu', phone: '9876543211', whatsappNumber: '9876543211', department: 'ECE' });

      const res = await request(app)
        .get('/api/v1/students?department=CSE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveLength(1);
      expect(res.body.data.data[0].department).toBe('CSE');
    });

    it('filters by semester', async () => {
      await createTestStudent({ semester: 4 });
      await createTestStudent({ studentId: '22CSE002', registerNumber: 'REG2022002', email: 'jane@hits.edu', phone: '9876543211', whatsappNumber: '9876543211', semester: 6 });

      const res = await request(app)
        .get('/api/v1/students?semester=4')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveLength(1);
      expect(res.body.data.data[0].semester).toBe(4);
    });

    it('searches by name', async () => {
      await createTestStudent({ fullName: 'John Doe' });

      const res = await request(app)
        .get('/api/v1/students?search=John')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveLength(1);
      expect(res.body.data.data[0].fullName).toBe('John Doe');
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/v1/students');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/students/:id', () => {
    it('returns a student by id', async () => {
      const student = await createTestStudent();

      const res = await request(app)
        .get(`/api/v1/students/${student._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.studentId).toBe('22CSE001');
    });

    it('returns 404 for nonexistent student', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/students/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/students/student-id/:studentId', () => {
    it('returns a student by studentId', async () => {
      await createTestStudent();

      const res = await request(app)
        .get('/api/v1/students/student-id/22CSE001')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.studentId).toBe('22CSE001');
    });
  });

  describe('GET /api/v1/students/register/:registerNumber', () => {
    it('returns a student by registerNumber', async () => {
      await createTestStudent();

      const res = await request(app)
        .get('/api/v1/students/register/REG2022001')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.registerNumber).toBe('REG2022001');
    });
  });

  describe('POST /api/v1/students', () => {
    it('creates a new student', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId,
          studentId: '22CSE002',
          registerNumber: 'REG2022002',
          rollNumber: 'R002',
          fullName: 'Jane Doe',
          email: 'jane@hits.edu',
          phone: '9876543211',
          gender: 'female',
          dateOfBirth: '2001-05-20',
          department: 'CSE',
          program: 'B.Tech',
          semester: 4,
          section: 'A',
          batch: '2022-2026',
          advisor: 'Dr. Smith',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.studentId).toBe('22CSE002');
    });

    it('returns 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: '22CSE003',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/v1/students/:id', () => {
    it('updates a student', async () => {
      const student = await createTestStudent();

      const res = await request(app)
        .put(`/api/v1/students/${student._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: 'John Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data.fullName).toBe('John Updated');
    });
  });

  describe('DELETE /api/v1/students/:id', () => {
    it('soft deletes a student', async () => {
      const student = await createTestStudent();

      const res = await request(app)
        .delete(`/api/v1/students/${student._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const dbStudent = await Student.findById(student._id);
      expect(dbStudent?.isActive).toBe(false);
    });
  });

  describe('GET /api/v1/students/department/:department', () => {
    it('returns students by department', async () => {
      await createTestStudent({ department: 'CSE' });

      const res = await request(app)
        .get('/api/v1/students/department/CSE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students).toHaveLength(1);
    });
  });

  describe('GET /api/v1/students/class/:department/:semester/:section', () => {
    it('returns students by class', async () => {
      await createTestStudent({ department: 'CSE', semester: 4, section: 'A' });

      const res = await request(app)
        .get('/api/v1/students/class/CSE/4/A')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students).toHaveLength(1);
    });
  });

  describe('GET /api/v1/students/count', () => {
    it('returns total count', async () => {
      await createTestStudent();

      const res = await request(app)
        .get('/api/v1/students/count')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
    });
  });
});
