import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Subject } from '../../../src/database/models/Subject.js';
import { Schedule } from '../../../src/database/models/Schedule.js';
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

  describe('POST /api/v1/subjects', () => {
    it('creates a subject with faculty and prerequisites', async () => {
      const res = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'CS301', name: 'DSA', department: 'CSE', semester: 5, credits: 4,
          type: 'theory', faculty: 'Dr. Singh', prerequisites: [],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('CS301');
      expect(res.body.data.faculty).toBe('Dr. Singh');
      expect(res.body.data.prerequisites).toEqual([]);
    });

    it('creates subject with prerequisites', async () => {
      await Subject.create({
        code: 'CS301', name: 'DSA', department: 'CSE', semester: 5, credits: 4,
        type: 'theory', faculty: 'Dr. Singh', prerequisites: [],
      });

      const res = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4,
          type: 'theory', faculty: 'Dr. Sharma', prerequisites: ['CS301'],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.prerequisites).toEqual(['CS301']);
    });

    it('rejects non-existent prerequisite', async () => {
      const res = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4,
          type: 'theory', faculty: 'Dr. Sharma', prerequisites: ['CS999'],
        });

      expect(res.status).toBe(400);
    });

    it('rejects self-referencing prerequisite', async () => {
      const res = await request(app)
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4,
          type: 'theory', faculty: 'Dr. Sharma', prerequisites: ['CS401'],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/subjects', () => {
    it('returns all subjects', async () => {
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4, type: 'theory', faculty: 'Dr. Sharma',
      });
      await Subject.create({
        code: 'CS402', name: 'OS', department: 'CSE', semester: 7, credits: 4, type: 'theory', faculty: 'Dr. Patel',
      });

      const res = await request(app).get('/api/v1/subjects');

      expect(res.status).toBe(200);
      expect(res.body.data.subjects).toHaveLength(2);
    });

    it('filters by faculty', async () => {
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4, type: 'theory', faculty: 'Dr. Sharma',
      });
      await Subject.create({
        code: 'CS402', name: 'OS', department: 'CSE', semester: 7, credits: 4, type: 'theory', faculty: 'Dr. Patel',
      });

      const res = await request(app).get('/api/v1/subjects?faculty=Dr.+Sharma');

      expect(res.status).toBe(200);
      expect(res.body.data.subjects).toHaveLength(1);
      expect(res.body.data.subjects[0].code).toBe('CS401');
    });

    it('filters by department', async () => {
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4, type: 'theory', faculty: 'Dr. Sharma',
      });
      await Subject.create({
        code: 'EC401', name: 'Signals', department: 'ECE', semester: 7, credits: 4, type: 'theory', faculty: 'Dr. Kumar',
      });

      const res = await request(app).get('/api/v1/subjects?department=CSE');

      expect(res.status).toBe(200);
      expect(res.body.data.subjects).toHaveLength(1);
    });

    it('searches by faculty name', async () => {
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4, type: 'theory', faculty: 'Dr. Sharma',
      });

      const res = await request(app).get('/api/v1/subjects?search=Sharma');

      expect(res.status).toBe(200);
      expect(res.body.data.subjects).toHaveLength(1);
    });
  });

  describe('GET /api/v1/subjects/code/:code', () => {
    it('returns subject by code with new fields', async () => {
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4,
        type: 'theory', faculty: 'Dr. Sharma', prerequisites: ['CS301'],
      });

      const res = await request(app).get('/api/v1/subjects/code/CS401');

      expect(res.status).toBe(200);
      expect(res.body.data.faculty).toBe('Dr. Sharma');
      expect(res.body.data.prerequisites).toEqual(['CS301']);
    });
  });

  describe('PUT /api/v1/subjects/:id', () => {
    it('updates faculty', async () => {
      const subject = await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4,
        type: 'theory', faculty: 'Dr. Sharma', prerequisites: [],
      });

      const res = await request(app)
        .put(`/api/v1/subjects/${subject._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ faculty: 'Dr. New Faculty' });

      expect(res.status).toBe(200);
      expect(res.body.data.faculty).toBe('Dr. New Faculty');
    });

    it('updates prerequisites', async () => {
      await Subject.create({
        code: 'CS301', name: 'DSA', department: 'CSE', semester: 5, credits: 4,
        type: 'theory', faculty: 'Dr. Singh', prerequisites: [],
      });
      const subject = await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4,
        type: 'theory', faculty: 'Dr. Sharma', prerequisites: [],
      });

      const res = await request(app)
        .put(`/api/v1/subjects/${subject._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ prerequisites: ['CS301'] });

      expect(res.status).toBe(200);
      expect(res.body.data.prerequisites).toEqual(['CS301']);
    });
  });

  describe('GET /api/v1/subjects/code/:code/prerequisites', () => {
    it('returns prerequisites for a subject', async () => {
      await Subject.create({
        code: 'CS301', name: 'DSA', department: 'CSE', semester: 5, credits: 4,
        type: 'theory', faculty: 'Dr. Singh', prerequisites: [],
      });
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4,
        type: 'theory', faculty: 'Dr. Sharma', prerequisites: ['CS301'],
      });

      const res = await request(app).get('/api/v1/subjects/code/CS401/prerequisites');

      expect(res.status).toBe(200);
      expect(res.body.data.prerequisites).toHaveLength(1);
      expect(res.body.data.prerequisites[0].code).toBe('CS301');
    });
  });

  describe('GET /api/v1/subjects/code/:code/schedule', () => {
    it('returns timetable for a subject', async () => {
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4,
        type: 'theory', faculty: 'Dr. Sharma', prerequisites: [],
      });
      await Schedule.create({
        department: 'CSE', year: 4, section: 'A', dayOfWeek: 'Monday',
        periodNumber: 1, timeSlot: '09:00-10:00', subject: 'CS401',
        faculty: 'Dr. Sharma', room: '301',
        type: 'lecture', semester: 7, academicYear: '2025-26',
      });

      const res = await request(app).get('/api/v1/subjects/code/CS401/schedule');

      expect(res.status).toBe(200);
      expect(res.body.data.schedule).toHaveLength(1);
      expect(res.body.data.schedule[0].dayOfWeek).toBe('Monday');
    });

    it('returns 404 for unknown subject', async () => {
      const res = await request(app).get('/api/v1/subjects/code/UNKNOWN/schedule');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/subjects/code/:code/results', () => {
    it('returns results and stats for a subject', async () => {
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4,
        type: 'theory', faculty: 'Dr. Sharma', prerequisites: [],
      });
      await Result.create({
        studentId: '22CSE001', semester: 7, subject: 'CS401',
        marksObtained: 85, totalMarks: 100, grade: 'A', cgpa: 8.5,
        examType: 'final', academicYear: '2025-26',
      });
      await Result.create({
        studentId: '22CSE002', semester: 7, subject: 'CS401',
        marksObtained: 70, totalMarks: 100, grade: 'B', cgpa: 7.0,
        examType: 'final', academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/subjects/code/CS401/results?semester=7&academicYear=2025-26');

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(2);
      expect(res.body.data.stats.totalStudents).toBe(2);
      expect(res.body.data.stats.averageMarks).toBe(78);
      expect(res.body.data.stats.passRate).toBe(100);
    });
  });

  describe('GET /api/v1/subjects/code/:code/validate-prerequisites', () => {
    it('validates prerequisite chain', async () => {
      await Subject.create({
        code: 'CS301', name: 'DSA', department: 'CSE', semester: 5, credits: 4,
        type: 'theory', faculty: 'Dr. Singh', prerequisites: [],
      });
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4,
        type: 'theory', faculty: 'Dr. Sharma', prerequisites: ['CS301'],
      });

      const res = await request(app).get('/api/v1/subjects/code/CS401/validate-prerequisites');

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.chain).toContain('CS401');
      expect(res.body.data.chain).toContain('CS301');
    });

    it('detects missing prerequisites in chain', async () => {
      await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4,
        type: 'theory', faculty: 'Dr. Sharma', prerequisites: ['MISSING'],
      });

      const res = await request(app).get('/api/v1/subjects/code/CS401/validate-prerequisites');

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(false);
      expect(res.body.data.missing).toContain('MISSING');
    });
  });

  describe('DELETE /api/v1/subjects/:id', () => {
    it('deletes a subject', async () => {
      const subject = await Subject.create({
        code: 'CS401', name: 'DBMS', department: 'CSE', semester: 7, credits: 4, type: 'theory', faculty: 'Dr. Sharma',
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
