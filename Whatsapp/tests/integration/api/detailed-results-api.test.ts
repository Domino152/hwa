import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Subject } from '../../../src/database/models/Subject.js';
import { DetailedResult } from '../../../src/database/models/DetailedResult.js';
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

describe('Detailed Results API', () => {
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

    await Subject.create({
      code: 'CS401', name: 'DBMS', department: 'CSE', semester: 1,
      credits: 4, type: 'theory', faculty: 'Dr. Smith', prerequisites: [],
    });
    await Subject.create({
      code: 'CS402', name: 'Operating Systems', department: 'CSE', semester: 1,
      credits: 4, type: 'theory', faculty: 'Dr. Jones', prerequisites: [],
    });
  });

  describe('POST /api/v1/detailed-results', () => {
    it('creates a detailed result with computed totals and grade', async () => {
      const res = await request(app)
        .post('/api/v1/detailed-results')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          subjectCode: 'cs401',
          semester: 1,
          academicYear: '2025-26',
          internalMarks: 35,
          internalMax: 40,
          externalMarks: 55,
          externalMax: 60,
          assignmentMarks: 9,
          assignmentMax: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.subjectCode).toBe('CS401');
      expect(res.body.data.totalMarks).toBe(99);
      expect(res.body.data.totalMax).toBe(110);
      expect(res.body.data.percentage).toBe(90);
      expect(res.body.data.grade).toBe('S');
      expect(res.body.data.gradePoints).toBe(10);
      expect(res.body.data.credits).toBe(4);
    });

    it('returns 404 for unknown subject', async () => {
      const res = await request(app)
        .post('/api/v1/detailed-results')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          subjectCode: 'UNKNOWN',
          semester: 1,
          academicYear: '2025-26',
          internalMarks: 35,
        });

      expect(res.status).toBe(404);
    });

    it('handles absent students', async () => {
      const res = await request(app)
        .post('/api/v1/detailed-results')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          subjectCode: 'cs401',
          semester: 1,
          academicYear: '2025-26',
          isAbsent: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.grade).toBe('Ab');
    });
  });

  describe('POST /api/v1/detailed-results/bulk', () => {
    it('creates multiple results', async () => {
      const res = await request(app)
        .post('/api/v1/detailed-results/bulk')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          results: [
            {
              studentId: '22CSE001', subjectCode: 'CS401', semester: 1,
              academicYear: '2025-26', internalMarks: 35, internalMax: 40,
              externalMarks: 55, externalMax: 60,
            },
            {
              studentId: '22CSE001', subjectCode: 'CS402', semester: 1,
              academicYear: '2025-26', internalMarks: 30, internalMax: 40,
              externalMarks: 50, externalMax: 60,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.created).toBe(2);
      expect(res.body.data.failed).toBe(0);
    });
  });

  describe('GET /api/v1/detailed-results/student/:studentId', () => {
    it('returns all results for a student', async () => {
      await DetailedResult.create({
        studentId: '22CSE001', subjectCode: 'CS401', subjectName: 'DBMS',
        semester: 1, academicYear: '2025-26',
        internalMarks: 35, internalMax: 40, externalMarks: 55, externalMax: 60,
        assignmentMarks: 9, assignmentMax: 10, labMarks: null, labMax: 0,
        totalMarks: 99, totalMax: 110, percentage: 90, credits: 4,
        grade: 'S', gradePoints: 10, isPublished: true, isAbsent: false,
      });
      await DetailedResult.create({
        studentId: '22CSE001', subjectCode: 'CS402', subjectName: 'OS',
        semester: 1, academicYear: '2025-26',
        internalMarks: 30, internalMax: 40, externalMarks: 50, externalMax: 60,
        assignmentMarks: 8, assignmentMax: 10, labMarks: null, labMax: 0,
        totalMarks: 88, totalMax: 110, percentage: 80, credits: 4,
        grade: 'A+', gradePoints: 9, isPublished: true, isAbsent: false,
      });

      const res = await request(app)
        .get('/api/v1/detailed-results/student/22CSE001')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(2);
      expect(res.body.data.hasData).toBe(true);
    });
  });

  describe('GET /api/v1/detailed-results/student/:studentId/semester', () => {
    it('returns results for a specific semester', async () => {
      await DetailedResult.create({
        studentId: '22CSE001', subjectCode: 'CS401', subjectName: 'DBMS',
        semester: 1, academicYear: '2025-26',
        internalMarks: 35, totalMarks: 99, totalMax: 110, percentage: 90,
        credits: 4, grade: 'S', gradePoints: 10,
      });
      await DetailedResult.create({
        studentId: '22CSE001', subjectCode: 'CS501', subjectName: 'Algo',
        semester: 2, academicYear: '2025-26',
        internalMarks: 30, totalMarks: 88, totalMax: 110, percentage: 80,
        credits: 4, grade: 'A+', gradePoints: 9,
      });

      const res = await request(app)
        .get('/api/v1/detailed-results/student/22CSE001/semester?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].subjectCode).toBe('CS401');
    });
  });

  describe('GET /api/v1/detailed-results/student/:studentId/cgpa', () => {
    it('returns overall CGPA', async () => {
      await DetailedResult.create({
        studentId: '22CSE001', subjectCode: 'CS401', subjectName: 'DBMS',
        semester: 1, academicYear: '2025-26',
        internalMarks: 35, totalMarks: 99, totalMax: 110, percentage: 90,
        credits: 4, grade: 'S', gradePoints: 10,
      });
      await DetailedResult.create({
        studentId: '22CSE001', subjectCode: 'CS402', subjectName: 'OS',
        semester: 1, academicYear: '2025-26',
        internalMarks: 30, totalMarks: 88, totalMax: 110, percentage: 80,
        credits: 4, grade: 'A+', gradePoints: 9,
      });

      const res = await request(app)
        .get('/api/v1/detailed-results/student/22CSE001/cgpa')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.cgpa).toBe(9.5);
      expect(res.body.data.totalCredits).toBe(8);
      expect(res.body.data.totalSubjects).toBe(2);
    });

    it('returns 0 CGPA for no results', async () => {
      const res = await request(app)
        .get('/api/v1/detailed-results/student/UNKNOWN/cgpa')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.cgpa).toBe(0);
      expect(res.body.data.hasData).toBe(false);
    });
  });

  describe('GET /api/v1/detailed-results/student/:studentId/semester-gpa', () => {
    it('returns GPA for a specific semester', async () => {
      await DetailedResult.create({
        studentId: '22CSE001', subjectCode: 'CS401', subjectName: 'DBMS',
        semester: 1, academicYear: '2025-26',
        internalMarks: 35, totalMarks: 99, totalMax: 110, percentage: 90,
        credits: 4, grade: 'S', gradePoints: 10,
      });
      await DetailedResult.create({
        studentId: '22CSE001', subjectCode: 'CS402', subjectName: 'OS',
        semester: 1, academicYear: '2025-26',
        internalMarks: 30, totalMarks: 88, totalMax: 110, percentage: 80,
        credits: 4, grade: 'A+', gradePoints: 9,
      });

      const res = await request(app)
        .get('/api/v1/detailed-results/student/22CSE001/semester-gpa?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.semesterGpa.gpa).toBe(9.5);
      expect(res.body.data.semesterGpa.totalCredits).toBe(8);
    });
  });

  describe('GET /api/v1/detailed-results/student/:studentId/subject/:subjectCode', () => {
    it('returns results for a specific subject', async () => {
      await DetailedResult.create({
        studentId: '22CSE001', subjectCode: 'CS401', subjectName: 'DBMS',
        semester: 1, academicYear: '2025-26',
        internalMarks: 35, totalMarks: 99, totalMax: 110, percentage: 90,
        credits: 4, grade: 'S', gradePoints: 10,
      });

      const res = await request(app)
        .get('/api/v1/detailed-results/student/22CSE001/subject/cs401?academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subjectCode).toBe('CS401');
    });
  });

  describe('GET /api/v1/detailed-results/subject/:subjectCode', () => {
    it('returns all student results for a subject', async () => {
      await DetailedResult.create({
        studentId: '22CSE001', subjectCode: 'CS401', subjectName: 'DBMS',
        semester: 1, academicYear: '2025-26',
        internalMarks: 35, totalMarks: 99, totalMax: 110, percentage: 90,
        credits: 4, grade: 'S', gradePoints: 10,
      });

      const res = await request(app)
        .get('/api/v1/detailed-results/subject/cs401?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subjectCode).toBe('CS401');
      expect(res.body.data.results).toHaveLength(1);
    });
  });

  describe('GET /api/v1/detailed-results/subject/:subjectCode/stats', () => {
    it('returns subject statistics', async () => {
      await DetailedResult.create({
        studentId: '22CSE001', subjectCode: 'CS401', subjectName: 'DBMS',
        semester: 1, academicYear: '2025-26',
        internalMarks: 35, totalMarks: 99, totalMax: 110, percentage: 90,
        credits: 4, grade: 'S', gradePoints: 10,
      });
      await DetailedResult.create({
        studentId: '22CSE002', subjectCode: 'CS401', subjectName: 'DBMS',
        semester: 1, academicYear: '2025-26',
        internalMarks: 20, totalMarks: 55, totalMax: 110, percentage: 50,
        credits: 4, grade: 'B', gradePoints: 6,
      });

      const res = await request(app)
        .get('/api/v1/detailed-results/subject/cs401/stats?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.studentCount).toBe(2);
      expect(res.body.data.passCount).toBe(2);
      expect(res.body.data.failCount).toBe(0);
      expect(res.body.data.averagePercentage).toBe(70);
    });
  });

  describe('DELETE /api/v1/detailed-results/student/:studentId/subject/:subjectCode', () => {
    it('deletes a result', async () => {
      await DetailedResult.create({
        studentId: '22CSE001', subjectCode: 'CS401', subjectName: 'DBMS',
        semester: 1, academicYear: '2025-26',
        internalMarks: 35, totalMarks: 99, totalMax: 110, percentage: 90,
        credits: 4, grade: 'S', gradePoints: 10,
      });

      const res = await request(app)
        .delete('/api/v1/detailed-results/student/22CSE001/subject/cs401?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(1);
    });

    it('returns 404 when not found', async () => {
      const res = await request(app)
        .delete('/api/v1/detailed-results/student/22CSE001/subject/cs401?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/detailed-results/student/:studentId/publish', () => {
    it('publishes unpublished results', async () => {
      await DetailedResult.create({
        studentId: '22CSE001', subjectCode: 'CS401', subjectName: 'DBMS',
        semester: 1, academicYear: '2025-26',
        internalMarks: 35, totalMarks: 99, totalMax: 110, percentage: 90,
        credits: 4, grade: 'S', gradePoints: 10, isPublished: false,
      });

      const res = await request(app)
        .post('/api/v1/detailed-results/student/22CSE001/publish')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ semester: 1, academicYear: '2025-26' });

      expect(res.status).toBe(200);
      expect(res.body.data.published).toBe(1);
    });

    it('returns 404 when no results exist', async () => {
      const res = await request(app)
        .post('/api/v1/detailed-results/student/22CSE001/publish')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ semester: 1, academicYear: '2025-26' });

      expect(res.status).toBe(404);
    });
  });
});