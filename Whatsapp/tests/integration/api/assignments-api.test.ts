import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Assignment } from '../../../src/database/models/Assignment.js';
import { AssignmentSubmission } from '../../../src/database/models/AssignmentSubmission.js';
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

describe('Assignments API', () => {
  let studentToken: string;
  let facultyToken: string;

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

    const faculty = await User.create({
      fullName: 'Dr. Smith',
      username: 'F001',
      passwordHash: '$2b$10$hashedpw',
      role: 'student',
      studentId: 'F001',
      department: 'CSE',
      year: 1,
      section: 'A',
    });
    facultyToken = signToken({ userId: String(faculty._id), username: 'F001', role: 'student' });
  });

  describe('Assignment CRUD', () => {
    let assignmentId: string;

    it('creates an assignment', async () => {
      const res = await request(app)
        .post('/api/v1/assignments')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          title: 'DBMS Assignment 1',
          description: 'Normalize to 3NF',
          subject: 'DBMS',
          department: 'CSE',
          semester: 4,
          academicYear: '2025-26',
          createdBy: 'F001',
          facultyName: 'Dr. Smith',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          maxMarks: 100,
          passingMarks: 40,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('DBMS Assignment 1');
      expect(res.body.data.status).toBe('draft');
      assignmentId = res.body.data.id;
    });

    it('rejects invalid maxMarks', async () => {
      const res = await request(app)
        .post('/api/v1/assignments')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          title: 'Bad', description: 'Bad', subject: 'CS', department: 'CSE',
          semester: 1, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
          dueDate: new Date(Date.now() + 86400000).toISOString(), maxMarks: -5, passingMarks: 0,
        });
      expect(res.status).toBe(400);
    });

    it('gets an assignment by id', async () => {
      const created = await Assignment.create({
        title: 'Test', description: 'Test', subject: 'CS', department: 'CSE',
        semester: 1, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
        dueDate: new Date(Date.now() + 86400000), maxMarks: 100, passingMarks: 40,
        status: 'draft',
      });

      const res = await request(app)
        .get(`/api/v1/assignments/${String(created._id)}`)
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Test');
    });

    it('gets assignments by subject', async () => {
      await Assignment.create({
        title: 'CS1', description: 'Test', subject: 'DBMS', department: 'CSE',
        semester: 4, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
        dueDate: new Date(Date.now() + 86400000), maxMarks: 100, passingMarks: 40,
        status: 'published',
      });

      const res = await request(app)
        .get('/api/v1/assignments/by-subject?subject=DBMS&department=CSE&semester=4&academicYear=2025-26')
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.assignments.length).toBeGreaterThan(0);
    });

    it('gets published assignments', async () => {
      await Assignment.create({
        title: 'Pub', description: 'Test', subject: 'CS', department: 'CSE',
        semester: 1, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
        dueDate: new Date(Date.now() + 86400000), maxMarks: 100, passingMarks: 40,
        status: 'published',
      });

      const res = await request(app)
        .get('/api/v1/assignments/published?department=CSE&semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.assignments.length).toBeGreaterThan(0);
    });

    it('gets overdue assignments', async () => {
      await Assignment.create({
        title: 'Overdue', description: 'Test', subject: 'CS', department: 'CSE',
        semester: 1, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
        dueDate: new Date(Date.now() - 86400000), maxMarks: 100, passingMarks: 40,
        status: 'published',
      });

      const res = await request(app)
        .get('/api/v1/assignments/overdue?department=CSE&semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.assignments.length).toBe(1);
    });

    it('gets assignments by faculty', async () => {
      await Assignment.create({
        title: 'F1', description: 'Test', subject: 'CS', department: 'CSE',
        semester: 1, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
        dueDate: new Date(Date.now() + 86400000), maxMarks: 100, passingMarks: 40,
        status: 'draft',
      });

      const res = await request(app)
        .get('/api/v1/assignments/faculty/F001')
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.assignments.length).toBeGreaterThan(0);
    });

    it('updates a draft assignment', async () => {
      const created = await Assignment.create({
        title: 'Old', description: 'Test', subject: 'CS', department: 'CSE',
        semester: 1, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
        dueDate: new Date(Date.now() + 86400000), maxMarks: 100, passingMarks: 40,
        status: 'draft',
      });

      const res = await request(app)
        .put(`/api/v1/assignments/${String(created._id)}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ title: 'New Title' });
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('New Title');
    });

    it('publishes and closes an assignment', async () => {
      const created = await Assignment.create({
        title: 'ToPublish', description: 'Test', subject: 'CS', department: 'CSE',
        semester: 1, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
        dueDate: new Date(Date.now() + 86400000), maxMarks: 100, passingMarks: 40,
        status: 'draft',
      });

      const pub = await request(app)
        .post(`/api/v1/assignments/${String(created._id)}/publish`)
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(pub.status).toBe(200);
      expect(pub.body.data.status).toBe('published');

      const close = await request(app)
        .post(`/api/v1/assignments/${String(created._id)}/close`)
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(close.status).toBe(200);
      expect(close.body.data.status).toBe('closed');
    });

    it('deletes a draft assignment', async () => {
      const created = await Assignment.create({
        title: 'ToDelete', description: 'Test', subject: 'CS', department: 'CSE',
        semester: 1, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
        dueDate: new Date(Date.now() + 86400000), maxMarks: 100, passingMarks: 40,
        status: 'draft',
      });

      const res = await request(app)
        .delete(`/api/v1/assignments/${String(created._id)}`)
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
    });

    it('returns 404 for missing assignment', async () => {
      const res = await request(app)
        .get('/api/v1/assignments/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Submissions', () => {
    let publishedAssignmentId: string;

    beforeEach(async () => {
      const created = await Assignment.create({
        title: 'Submit Test', description: 'Test', subject: 'CS', department: 'CSE',
        semester: 1, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), maxMarks: 100, passingMarks: 40,
        status: 'published',
      });
      publishedAssignmentId = String(created._id);
    });

    it('submits an assignment', async () => {
      const res = await request(app)
        .post('/api/v1/assignments/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: publishedAssignmentId,
          studentId: '22CSE001',
          studentName: 'Arjun',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.wasLate).toBe(false);
    });

    it('rejects duplicate submission', async () => {
      await request(app)
        .post('/api/v1/assignments/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: publishedAssignmentId,
          studentId: '22CSE001',
          studentName: 'Arjun',
        });

      const res = await request(app)
        .post('/api/v1/assignments/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: publishedAssignmentId,
          studentId: '22CSE001',
          studentName: 'Arjun',
        });
      expect(res.status).toBe(400);
    });

    it('lists submissions by assignment', async () => {
      await request(app)
        .post('/api/v1/assignments/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: publishedAssignmentId,
          studentId: '22CSE001',
          studentName: 'Arjun',
        });

      const res = await request(app)
        .get(`/api/v1/assignments/${publishedAssignmentId}/submissions`)
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.submissions.length).toBe(1);
    });

    it('lists submissions by student', async () => {
      await request(app)
        .post('/api/v1/assignments/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: publishedAssignmentId,
          studentId: '22CSE001',
          studentName: 'Arjun',
        });

      const res = await request(app)
        .get('/api/v1/assignments/submissions/student/22CSE001')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.submissions.length).toBe(1);
    });

    it('gets submission stats', async () => {
      await request(app)
        .post('/api/v1/assignments/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: publishedAssignmentId,
          studentId: '22CSE001',
          studentName: 'Arjun',
        });

      const res = await request(app)
        .get(`/api/v1/assignments/${publishedAssignmentId}/stats`)
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.totalSubmissions).toBe(1);
    });
  });

  describe('Grading', () => {
    let submissionId: string;
    let gradeAssignmentId: string;

    beforeEach(async () => {
      const created = await Assignment.create({
        title: 'Grade Test', description: 'Test', subject: 'CS', department: 'CSE',
        semester: 1, academicYear: '2025-26', createdBy: 'F001', facultyName: 'Dr.',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), maxMarks: 100, passingMarks: 40,
        status: 'published',
      });
      gradeAssignmentId = String(created._id);

      const subRes = await request(app)
        .post('/api/v1/assignments/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: gradeAssignmentId,
          studentId: '22CSE001',
          studentName: 'Arjun',
        });
      submissionId = subRes.body.data.submission.id;
    });

    it('grades a submission', async () => {
      const res = await request(app)
        .post(`/api/v1/assignments/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          marks: 85,
          grade: '',
          feedback: 'Good work',
          gradedBy: 'F001',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.marks).toBe(85);
      expect(res.body.data.status).toBe('graded');
    });

    it('returns a graded submission', async () => {
      await request(app)
        .post(`/api/v1/assignments/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ marks: 80, grade: '', gradedBy: 'F001' });

      const res = await request(app)
        .post(`/api/v1/assignments/submissions/${submissionId}/return`)
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('returned');
    });

    it('allows resubmit after return', async () => {
      await request(app)
        .post(`/api/v1/assignments/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ marks: 80, grade: '', gradedBy: 'F001' });

      await request(app)
        .post(`/api/v1/assignments/submissions/${submissionId}/return`)
        .set('Authorization', `Bearer ${facultyToken}`);

      const res = await request(app)
        .post('/api/v1/assignments/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: gradeAssignmentId,
          studentId: '22CSE001',
          studentName: 'Arjun',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.submission.status).toBe('resubmitted');
    });

    it('rejects invalid grading marks', async () => {
      const res = await request(app)
        .post(`/api/v1/assignments/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ marks: -5, grade: '', gradedBy: 'F001' });
      expect(res.status).toBe(400);
    });
  });

  describe('Auth', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/assignments/published?department=CSE&semester=1&academicYear=2025-26');
      expect(res.status).toBe(401);
    });
  });
});