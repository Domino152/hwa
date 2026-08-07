import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Schedule, HolidayOverride } from '../../../src/database/models/Schedule.js';
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

const SCHEDULE_BASE = {
  department: 'CSE',
  year: 4,
  section: 'A',
  semester: 1,
  academicYear: '2025-26',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getISTDayIndex(now?: Date): number {
  const d = now ?? new Date();
  const ist = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return ist.getDay();
}

const TODAY = DAY_NAMES[getISTDayIndex()]!;
const TOMORROW = DAY_NAMES[(getISTDayIndex() + 1) % 7]!;

function makeEntries(day: string) {
  return [
    { ...SCHEDULE_BASE, dayOfWeek: day, periodNumber: 1, timeSlot: '09:00-10:00', subject: 'DBMS', faculty: 'Dr. Smith', room: 'Room 101', type: 'lecture' as const },
    { ...SCHEDULE_BASE, dayOfWeek: day, periodNumber: 2, timeSlot: '10:00-11:00', subject: 'OS', faculty: 'Dr. Jones', room: 'Room 102', type: 'lecture' as const },
    { ...SCHEDULE_BASE, dayOfWeek: day, periodNumber: 3, timeSlot: '11:00-12:00', subject: 'Java', faculty: 'Dr. Brown', room: 'Room 103', type: 'lecture' as const },
  ];
}

function makeTomorrowEntries(day: string) {
  return [
    { ...SCHEDULE_BASE, dayOfWeek: day, periodNumber: 1, timeSlot: '09:00-10:00', subject: 'DBMS', faculty: 'Dr. Smith', room: 'Room 101', type: 'lecture' as const },
    { ...SCHEDULE_BASE, dayOfWeek: day, periodNumber: 2, timeSlot: '10:00-11:00', subject: 'DBMS Lab', faculty: 'Dr. Smith', room: 'Lab 201', type: 'lab' as const },
  ];
}

describe('Schedule API', () => {
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

  describe('GET /api/v1/schedule/today', () => {
    it('returns today\'s schedule response shape', async () => {
      await Schedule.insertMany(makeEntries(TODAY));

      const res = await request(app)
        .get(`/api/v1/schedule/today?department=CSE&year=4&section=A&academicYear=2025-26`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('hasData');
      expect(res.body.data).toHaveProperty('entries');
      expect(res.body.data).toHaveProperty('dayOfWeek');
      expect(res.body.data).toHaveProperty('isHoliday');
      expect(Array.isArray(res.body.data.entries)).toBe(true);
    });

    it('returns holiday info when today is a holiday', async () => {
      await HolidayOverride.create({
        department: 'CSE', year: 4, section: 'A',
        date: new Date(), reason: 'College Day',
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get(`/api/v1/schedule/today?department=CSE&year=4&section=A&academicYear=2025-26`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isHoliday).toBe(true);
      expect(res.body.data.holidayReason).toBe('College Day');
    });
  });

  describe('GET /api/v1/schedule/tomorrow', () => {
    it('returns tomorrow\'s schedule response shape', async () => {
      await Schedule.insertMany(makeTomorrowEntries(TOMORROW));

      const res = await request(app)
        .get(`/api/v1/schedule/tomorrow?department=CSE&year=4&section=A&academicYear=2025-26`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('hasData');
      expect(res.body.data).toHaveProperty('entries');
      expect(res.body.data).toHaveProperty('dayOfWeek');
      expect(res.body.data).toHaveProperty('isHoliday');
    });
  });

  describe('GET /api/v1/schedule/week', () => {
    it('returns full week schedule grouped by day', async () => {
      await Schedule.insertMany([...makeEntries('Monday'), ...makeTomorrowEntries('Tuesday')]);

      const res = await request(app)
        .get(`/api/v1/schedule/week?department=CSE&year=4&section=A&academicYear=2025-26`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasData).toBe(true);
      expect(res.body.data.schedule.Monday).toHaveLength(3);
      expect(res.body.data.schedule.Tuesday).toHaveLength(2);
    });
  });

  describe('GET /api/v1/schedule/current', () => {
    it('returns current class info', async () => {
      await Schedule.insertMany(makeEntries(TODAY));

      const res = await request(app)
        .get(`/api/v1/schedule/current?department=CSE&year=4&section=A&academicYear=2025-26`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('hasClass');
      expect(res.body.data).toHaveProperty('current');
    });
  });

  describe('GET /api/v1/schedule/next', () => {
    it('returns next class info', async () => {
      await Schedule.insertMany(makeEntries(TODAY));

      const res = await request(app)
        .get(`/api/v1/schedule/next?department=CSE&year=4&section=A&academicYear=2025-26`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('hasNext');
      expect(res.body.data).toHaveProperty('next');
    });
  });

  describe('GET /api/v1/schedule/day/:dayOfWeek', () => {
    it('returns schedule for a specific day', async () => {
      await Schedule.insertMany(makeEntries('Monday'));

      const res = await request(app)
        .get('/api/v1/schedule/day/Monday?department=CSE&year=4&section=A&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.entries).toHaveLength(3);
      expect(res.body.data.dayOfWeek).toBe('Monday');
    });
  });

  describe('POST /api/v1/schedule', () => {
    it('creates a schedule entry', async () => {
      const res = await request(app)
        .post('/api/v1/schedule')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          department: 'CSE', year: 4, section: 'A', dayOfWeek: 'Monday',
          periodNumber: 1, timeSlot: '09:00-10:00', subject: 'DBMS',
          faculty: 'Dr. Smith', room: 'Room 101', type: 'lecture',
          semester: 1, academicYear: '2025-26',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.subject).toBe('DBMS');
      expect(res.body.data.faculty).toBe('Dr. Smith');
      expect(res.body.data.periodNumber).toBe(1);
    });
  });

  describe('POST /api/v1/schedule/bulk', () => {
    it('creates multiple schedule entries', async () => {
      const res = await request(app)
        .post('/api/v1/schedule/bulk')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          schedules: makeEntries('Monday'),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.created).toBe(3);
    });
  });

  describe('DELETE /api/v1/schedule/day/:dayOfWeek', () => {
    it('deletes schedule for a day', async () => {
      await Schedule.insertMany(makeEntries('Monday'));

      const res = await request(app)
        .delete('/api/v1/schedule/day/Monday?department=CSE&year=4&section=A')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(3);
    });
  });

  describe('Holiday Overrides', () => {
    describe('GET /api/v1/schedule/holidays', () => {
      it('returns holiday overrides', async () => {
        await HolidayOverride.create({
          department: 'CSE', year: 4, section: 'A',
          date: new Date('2025-12-25'), reason: 'Christmas',
          academicYear: '2025-26',
        });

        const res = await request(app)
          .get('/api/v1/schedule/holidays?department=CSE&year=4&section=A&academicYear=2025-26')
          .set('Authorization', `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.holidays).toHaveLength(1);
        expect(res.body.data.count).toBe(1);
      });
    });

    describe('POST /api/v1/schedule/holidays', () => {
      it('adds a holiday override', async () => {
        const res = await request(app)
          .post('/api/v1/schedule/holidays')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            department: 'CSE', year: 4, section: 'A',
            date: '2025-12-25', reason: 'Christmas',
            academicYear: '2025-26',
          });

        expect(res.status).toBe(201);
        expect(res.body.data.reason).toBe('Christmas');
      });
    });

    describe('DELETE /api/v1/schedule/holidays', () => {
      it('removes a holiday override', async () => {
        await HolidayOverride.create({
          department: 'CSE', year: 4, section: 'A',
          date: new Date('2025-12-25'), reason: 'Christmas',
          academicYear: '2025-26',
        });

        const res = await request(app)
          .delete('/api/v1/schedule/holidays')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            department: 'CSE', year: 4, section: 'A',
            date: '2025-12-25', academicYear: '2025-26',
          });

        expect(res.status).toBe(200);
        expect(res.body.data.deleted).toBe(1);
      });
    });
  });

  describe('GET /api/v1/schedule/subjects', () => {
    it('returns distinct subjects for a class', async () => {
      await Schedule.insertMany(makeEntries('Monday'));

      const res = await request(app)
        .get('/api/v1/schedule/subjects?department=CSE&year=4&section=A')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subjects).toContain('DBMS');
      expect(res.body.data.subjects).toContain('OS');
      expect(res.body.data.subjects).toContain('Java');
    });
  });
});
