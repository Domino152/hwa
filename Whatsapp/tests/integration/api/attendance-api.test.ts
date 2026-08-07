import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Attendance } from '../../../src/database/models/Attendance.js';
import { DailyAttendance } from '../../../src/database/models/DailyAttendance.js';
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

describe('Attendance API', () => {
  let studentToken: string;
  let facultyToken: string;
  let userId: string;
  let facultyId: string;

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

    const faculty = await User.create({
      fullName: 'Dr. Sharma',
      username: 'FAC001',
      passwordHash: '$2b$10$hashedpw',
      role: 'student',
      studentId: 'FAC001',
      whatsappNumber: '917530063886',
      department: 'CSE',
      year: 1,
      section: 'A',
    });
    facultyId = String(faculty._id);
    facultyToken = signToken({ userId: facultyId, username: 'FAC001', role: 'student' });
  });

  // ===== Aggregate endpoints =====

  describe('GET /api/v1/attendance/student/:studentId', () => {
    it('returns attendance records for a student', async () => {
      await Attendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        totalClasses: 50,
        attendedClasses: 45,
        percentage: 90,
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/student/22CSE001')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.records).toHaveLength(1);
      expect(res.body.data.summary.overallPercentage).toBe(90);
      expect(res.body.data.hasData).toBe(true);
    });

    it('returns empty for unknown student', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/student/UNKNOWN')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasData).toBe(false);
    });

    it('requires authentication', async () => {
      const res = await request(app).get('/api/v1/attendance/student/22CSE001');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/attendance/student/:studentId/subject/:subject', () => {
    it('returns specific subject attendance', async () => {
      await Attendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        totalClasses: 50,
        attendedClasses: 45,
        percentage: 90,
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/student/22CSE001/subject/Mathematics')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.record).not.toBeNull();
      expect(res.body.data.record.subject).toBe('Mathematics');
    });
  });

  describe('POST /api/v1/attendance', () => {
    it('creates an attendance record', async () => {
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          subject: 'Physics',
          totalClasses: 40,
          attendedClasses: 38,
          semester: 1,
          academicYear: '2025-26',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.subject).toBe('Physics');
      expect(res.body.data.percentage).toBe(95);
    });
  });

  describe('POST /api/v1/attendance/bulk', () => {
    it('creates multiple attendance records', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          records: [
            { studentId: '22CSE001', subject: 'Math', totalClasses: 50, attendedClasses: 45, semester: 1, academicYear: '2025-26' },
            { studentId: '22CSE001', subject: 'Science', totalClasses: 40, attendedClasses: 38, semester: 1, academicYear: '2025-26' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.created).toBe(2);
    });
  });

  describe('PUT /api/v1/attendance/student/:studentId/subject/:subject', () => {
    it('updates an existing attendance record', async () => {
      await Attendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        totalClasses: 50,
        attendedClasses: 40,
        percentage: 80,
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .put('/api/v1/attendance/student/22CSE001/subject/Mathematics?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ attendedClasses: 48 });

      expect(res.status).toBe(200);
      expect(res.body.data.percentage).toBe(96);
    });
  });

  // ===== Daily Attendance =====

  describe('POST /api/v1/attendance/daily', () => {
    it('marks daily attendance', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/daily')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          subject: 'Mathematics',
          date: '2026-01-15',
          status: 'present',
          semester: 1,
          academicYear: '2025-26',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.studentId).toBe('22CSE001');
      expect(res.body.data.status).toBe('present');
    });

    it('marks attendance with faculty and notes', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/daily')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          subject: 'Mathematics',
          date: '2026-01-15',
          status: 'late',
          markedBy: facultyId,
          semester: 1,
          academicYear: '2025-26',
          notes: 'Arrived 10 minutes late',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('late');
      expect(res.body.data.markedBy).toBe(facultyId);
      expect(res.body.data.notes).toBe('Arrived 10 minutes late');
    });

    it('rejects invalid status', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/daily')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          subject: 'Mathematics',
          date: '2026-01-15',
          status: 'invalid',
          semester: 1,
          academicYear: '2025-26',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/attendance/daily/bulk', () => {
    it('marks bulk daily attendance', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/daily/bulk')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          records: [
            { studentId: '22CSE001', subject: 'Math', date: '2026-01-15', status: 'present', semester: 1, academicYear: '2025-26' },
            { studentId: '22CSE001', subject: 'Science', date: '2026-01-15', status: 'absent', semester: 1, academicYear: '2025-26' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.created).toBe(2);
    });
  });

  describe('GET /api/v1/attendance/daily/student/:studentId/date', () => {
    it('returns daily attendance for a date', async () => {
      await DailyAttendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        date: new Date('2026-01-15'),
        status: 'present',
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/daily/student/22CSE001/date?date=2026-01-15')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.records).toHaveLength(1);
      expect(res.body.data.hasData).toBe(true);
    });
  });

  describe('GET /api/v1/attendance/daily/student/:studentId/subject/:subject', () => {
    it('returns daily attendance for a subject in date range', async () => {
      await DailyAttendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        date: new Date('2026-01-15'),
        status: 'present',
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/daily/student/22CSE001/subject/Mathematics?startDate=2026-01-01&endDate=2026-01-31')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.records).toHaveLength(1);
    });
  });

  describe('GET /api/v1/attendance/daily/student/:studentId/semester', () => {
    it('returns daily attendance for a semester', async () => {
      await DailyAttendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        date: new Date('2026-01-15'),
        status: 'present',
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/daily/student/22CSE001/semester?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.records).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });
  });

  describe('GET /api/v1/attendance/daily/date-range', () => {
    it('returns records in date range', async () => {
      await DailyAttendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        date: new Date('2026-01-15'),
        status: 'present',
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/daily/date-range?startDate=2026-01-01&endDate=2026-01-31&semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.records).toHaveLength(1);
    });
  });

  // ===== Reports =====

  describe('GET /api/v1/attendance/report/monthly/:studentId', () => {
    it('returns monthly report', async () => {
      await DailyAttendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        date: new Date('2026-01-15'),
        status: 'present',
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/report/monthly/22CSE001?month=1&year=2026&semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.month).toContain('Jan');
      expect(res.body.data.totalClasses).toBe(1);
      expect(res.body.data.attendedClasses).toBe(1);
    });
  });

  describe('GET /api/v1/attendance/report/semester/:studentId', () => {
    it('returns semester report', async () => {
      await DailyAttendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        date: new Date('2026-01-15'),
        status: 'present',
        semester: 1,
        academicYear: '2025-26',
      });
      await DailyAttendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        date: new Date('2026-01-16'),
        status: 'absent',
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/report/semester/22CSE001?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalClasses).toBe(2);
      expect(res.body.data.attendedClasses).toBe(1);
      expect(res.body.data.percentage).toBe(50);
      expect(res.body.data.subjectWise).toHaveLength(1);
    });
  });

  // ===== Analytics =====

  describe('GET /api/v1/attendance/analytics/:studentId', () => {
    it('returns analytics with trend and risk level', async () => {
      for (let i = 1; i <= 5; i++) {
        await DailyAttendance.create({
          studentId: '22CSE001',
          subject: 'Mathematics',
          date: new Date(`2026-01-${10 + i}`),
          status: i <= 3 ? 'present' : 'absent',
          semester: 1,
          academicYear: '2025-26',
        });
      }

      const res = await request(app)
        .get('/api/v1/attendance/analytics/22CSE001?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.studentId).toBe('22CSE001');
      expect(res.body.data.overallPercentage).toBe(60);
      expect(res.body.data.subjectWise).toHaveLength(1);
      expect(res.body.data.monthlyTrend).toBeDefined();
      expect(res.body.data.riskLevel).toBeDefined();
      expect(res.body.data.belowThreshold).toBe(true);
    });
  });

  // ===== Summary =====

  describe('GET /api/v1/attendance/summary/:studentId', () => {
    it('returns attendance summary', async () => {
      await Attendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        totalClasses: 50,
        attendedClasses: 45,
        percentage: 90,
        semester: 1,
        academicYear: '2025-26',
      });
      await Attendance.create({
        studentId: '22CSE001',
        subject: 'Physics',
        totalClasses: 40,
        attendedClasses: 28,
        percentage: 70,
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/summary/22CSE001?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.studentId).toBe('22CSE001');
      expect(res.body.data.totalSubjects).toBe(2);
      expect(res.body.data.subjectsAbove75).toBe(1);
      expect(res.body.data.subjectsBelow75).toBe(1);
    });
  });

  // ===== Below-75% Detection =====

  describe('GET /api/v1/attendance/below-threshold', () => {
    it('returns students below 75% threshold', async () => {
      await Attendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        totalClasses: 50,
        attendedClasses: 30,
        percentage: 60,
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/below-threshold?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students).toHaveLength(1);
      expect(res.body.data.students[0].percentage).toBe(60);
      expect(res.body.data.threshold).toBe(75);
    });

    it('supports custom threshold', async () => {
      await Attendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        totalClasses: 50,
        attendedClasses: 42,
        percentage: 84,
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/below-threshold?semester=1&academicYear=2025-26&threshold=85')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students).toHaveLength(1);
      expect(res.body.data.threshold).toBe(85);
    });
  });

  describe('POST /api/v1/attendance/detect-alerts', () => {
    it('detects and creates alerts for below-threshold students', async () => {
      await Attendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        totalClasses: 50,
        attendedClasses: 30,
        percentage: 60,
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .post('/api/v1/attendance/detect-alerts')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ semester: 1, academicYear: '2025-26' });

      expect(res.status).toBe(200);
      expect(res.body.data.alerts).toHaveLength(1);
      expect(res.body.data.alerts[0].studentId).toBe('22CSE001');
      expect(res.body.data.alerts[0].percentage).toBe(60);
    });

    it('returns empty when all students above threshold', async () => {
      await Attendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        totalClasses: 50,
        attendedClasses: 45,
        percentage: 90,
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .post('/api/v1/attendance/detect-alerts')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ semester: 1, academicYear: '2025-26' });

      expect(res.status).toBe(200);
      expect(res.body.data.alerts).toHaveLength(0);
    });
  });

  // ===== History =====

  describe('GET /api/v1/attendance/history/:studentId', () => {
    it('returns paginated attendance history', async () => {
      for (let i = 1; i <= 5; i++) {
        await DailyAttendance.create({
          studentId: '22CSE001',
          subject: 'Mathematics',
          date: new Date(`2026-01-${10 + i}`),
          status: 'present',
          semester: 1,
          academicYear: '2025-26',
        });
      }

      const res = await request(app)
        .get('/api/v1/attendance/history/22CSE001?page=1&limit=3')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.records).toHaveLength(3);
      expect(res.body.data.total).toBe(5);
      expect(res.body.data.page).toBe(1);
    });
  });

  // ===== Student Lookup =====

  describe('GET /api/v1/attendance/lookup/:studentId', () => {
    it('returns combined attendance data for student', async () => {
      await Attendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        totalClasses: 50,
        attendedClasses: 45,
        percentage: 90,
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/attendance/lookup/22CSE001?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.studentId).toBe('22CSE001');
      expect(res.body.data.records).toBeDefined();
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.overall).toBeDefined();
      expect(res.body.data.overall.overallPercentage).toBe(90);
    });
  });

  // ===== Faculty Lookup =====

  describe('GET /api/v1/attendance/daily/faculty/:facultyId', () => {
    it('returns records marked by faculty', async () => {
      await DailyAttendance.create({
        studentId: '22CSE001',
        subject: 'Mathematics',
        date: new Date('2026-01-15'),
        status: 'present',
        markedBy: facultyId,
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get(`/api/v1/attendance/daily/faculty/${facultyId}?date=2026-01-15&semester=1&academicYear=2025-26`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.records).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });
  });

  // ===== Department Stats =====

  describe('GET /api/v1/attendance/department/stats', () => {
    it('returns department stats', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/department/stats?department=CSE&semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.department).toBe('CSE');
      expect(res.body.data.stats).toBeDefined();
    });
  });
});
