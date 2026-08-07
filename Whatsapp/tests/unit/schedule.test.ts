import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduleService, type ScheduleQueryParams } from '../../src/modules/schedule/schedule.service.js';
import type { IScheduleRepository } from '../../src/repositories/schedule.repository.js';
import type { ScheduleRecord, HolidayOverrideRecord } from '../../src/repositories/types.js';

function makeEntry(overrides: Partial<ScheduleRecord> = {}): ScheduleRecord {
  return {
    department: 'CSE',
    year: 4,
    section: 'A',
    dayOfWeek: 'Monday',
    periodNumber: 1,
    timeSlot: '09:00-10:00',
    subject: 'DBMS',
    faculty: 'Dr. Smith',
    room: 'Room 101',
    type: 'lecture',
    semester: 1,
    academicYear: '2025-26',
    ...overrides,
  };
}

function makeHoliday(overrides: Partial<HolidayOverrideRecord> = {}): HolidayOverrideRecord {
  return {
    id: 'holiday1',
    department: 'CSE',
    year: 4,
    section: 'A',
    date: new Date('2025-08-15'),
    reason: 'Independence Day',
    academicYear: '2025-26',
    ...overrides,
  };
}

function createMockRepo(): IScheduleRepository {
  return {
    findScheduleByClass: vi.fn().mockResolvedValue([]),
    findByWeek: vi.fn().mockResolvedValue([]),
    upsertSchedule: vi.fn().mockImplementation((r) => Promise.resolve(r)),
    upsertMany: vi.fn().mockResolvedValue(0),
    deleteByParams: vi.fn().mockResolvedValue(0),
    getSubjectsByClass: vi.fn().mockResolvedValue([]),
    findByDepartmentSemester: vi.fn().mockResolvedValue([]),
    findAllByClass: vi.fn().mockResolvedValue([]),
    findHolidayOverrides: vi.fn().mockResolvedValue([]),
    isHoliday: vi.fn().mockResolvedValue(null),
    addHolidayOverride: vi.fn().mockImplementation((r) => Promise.resolve(r)),
    removeHolidayOverride: vi.fn().mockResolvedValue(1),
  } as unknown as IScheduleRepository;
}

const defaultParams: ScheduleQueryParams = {
  department: 'CSE',
  year: 4,
  section: 'A',
  academicYear: '2025-26',
};

describe('ScheduleService', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let service: ScheduleService;

  beforeEach(() => {
    repo = createMockRepo() as unknown as ReturnType<typeof createMockRepo>;
    service = new ScheduleService(repo);
    vi.clearAllMocks();
  });

  describe('getByDay', () => {
    it('returns entries for a specific day', async () => {
      const entries = [makeEntry(), makeEntry({ periodNumber: 2, timeSlot: '10:00-11:00', subject: 'OS' })];
      vi.mocked(repo.findScheduleByClass).mockResolvedValue(entries);

      const result = await service.getByDay(defaultParams, 'Monday');

      expect(result.entries).toHaveLength(2);
      expect(result.dayOfWeek).toBe('Monday');
      expect(result.hasData).toBe(true);
    });

    it('returns empty when no entries', async () => {
      const result = await service.getByDay(defaultParams, 'Saturday');

      expect(result.entries).toHaveLength(0);
      expect(result.hasData).toBe(false);
    });
  });

  describe('getToday', () => {
    it('returns today\'s schedule', async () => {
      const entries = [makeEntry()];
      vi.mocked(repo.findScheduleByClass).mockResolvedValue(entries);

      const now = new Date('2025-08-11T10:00:00Z'); // Monday
      const result = await service.getToday(defaultParams, now);

      expect(result.dayOfWeek).toBe('Monday');
      expect(result.hasData).toBe(true);
      expect(result.isHoliday).toBe(false);
    });

    it('returns holiday info when today is a holiday', async () => {
      vi.mocked(repo.isHoliday).mockResolvedValue(makeHoliday());

      const now = new Date('2025-08-15T10:00:00Z');
      const result = await service.getToday(defaultParams, now);

      expect(result.isHoliday).toBe(true);
      expect(result.holidayReason).toBe('Independence Day');
      expect(result.entries).toHaveLength(0);
    });
  });

  describe('getTomorrow', () => {
    it('returns tomorrow\'s schedule', async () => {
      const entries = [makeEntry({ dayOfWeek: 'Tuesday' })];
      vi.mocked(repo.findScheduleByClass).mockResolvedValue(entries);

      const now = new Date('2025-08-11T10:00:00Z'); // Monday
      const result = await service.getTomorrow(defaultParams, now);

      expect(result.dayOfWeek).toBe('Tuesday');
      expect(result.hasData).toBe(true);
    });

    it('returns holiday info when tomorrow is a holiday', async () => {
      vi.mocked(repo.isHoliday).mockResolvedValue(makeHoliday({ reason: 'Holiday' }));

      const now = new Date('2025-08-14T10:00:00Z'); // Thursday, tomorrow is Friday (holiday)
      const result = await service.getTomorrow(defaultParams, now);

      expect(result.isHoliday).toBe(true);
    });
  });

  describe('getWeekly', () => {
    it('groups entries by day', async () => {
      const entries = [
        makeEntry({ dayOfWeek: 'Monday', periodNumber: 1 }),
        makeEntry({ dayOfWeek: 'Monday', periodNumber: 2, timeSlot: '10:00-11:00' }),
        makeEntry({ dayOfWeek: 'Tuesday', periodNumber: 1 }),
      ];
      vi.mocked(repo.findByWeek).mockResolvedValue(entries);

      const result = await service.getWeekly(defaultParams);

      expect(result.hasData).toBe(true);
      expect(result.schedule.Monday).toHaveLength(2);
      expect(result.schedule.Tuesday).toHaveLength(1);
    });

    it('returns empty when no entries', async () => {
      const result = await service.getWeekly(defaultParams);

      expect(result.hasData).toBe(false);
    });
  });

  describe('getCurrentClass', () => {
    it('returns current class when one is in progress', async () => {
      const entries = [
        makeEntry({ periodNumber: 1, timeSlot: '09:00-10:00' }),
        makeEntry({ periodNumber: 2, timeSlot: '10:00-11:00' }),
      ];
      vi.mocked(repo.findScheduleByClass).mockResolvedValue(entries);

      // Monday 09:30 IST
      const now = new Date('2025-08-11T04:00:00Z'); // 09:30 IST
      const result = await service.getCurrentClass(defaultParams, now);

      expect(result).not.toBeNull();
      expect(result!.entry.subject).toBe('DBMS');
      expect(result!.elapsedMinutes).toBe(30);
      expect(result!.remainingMinutes).toBe(30);
    });

    it('returns null when no class is in progress', async () => {
      const entries = [
        makeEntry({ periodNumber: 1, timeSlot: '09:00-10:00' }),
      ];
      vi.mocked(repo.findScheduleByClass).mockResolvedValue(entries);

      // Monday 11:00 IST
      const now = new Date('2025-08-11T05:30:00Z'); // 11:00 IST
      const result = await service.getCurrentClass(defaultParams, now);

      expect(result).toBeNull();
    });

    it('returns null on holiday', async () => {
      vi.mocked(repo.isHoliday).mockResolvedValue(makeHoliday());

      const now = new Date('2025-08-15T10:00:00Z');
      const result = await service.getCurrentClass(defaultParams, now);

      expect(result).toBeNull();
    });
  });

  describe('getNextClass', () => {
    it('returns next class today when there is one later', async () => {
      const entries = [
        makeEntry({ periodNumber: 1, timeSlot: '09:00-10:00' }),
        makeEntry({ periodNumber: 2, timeSlot: '10:00-11:00', subject: 'OS' }),
      ];
      vi.mocked(repo.findScheduleByClass).mockResolvedValue(entries);

      // Monday 09:30 IST
      const now = new Date('2025-08-11T04:00:00Z');
      const result = await service.getNextClass(defaultParams, now);

      expect(result).not.toBeNull();
      expect(result!.entry.subject).toBe('OS');
      expect(result!.isTomorrow).toBe(false);
      expect(result!.waitMinutes).toBe(30);
    });

    it('returns tomorrow\'s first class when no more today', async () => {
      const entries = [
        makeEntry({ periodNumber: 1, timeSlot: '09:00-10:00' }),
      ];
      vi.mocked(repo.findScheduleByClass).mockResolvedValue(entries);

      const tomorrowEntries = [makeEntry({ dayOfWeek: 'Tuesday', periodNumber: 1, timeSlot: '09:00-10:00' })];
      vi.mocked(repo.findScheduleByClass).mockResolvedValueOnce(entries).mockResolvedValueOnce(tomorrowEntries);

      // Monday 11:00 IST
      const now = new Date('2025-08-11T05:30:00Z');
      const result = await service.getNextClass(defaultParams, now);

      expect(result).not.toBeNull();
      expect(result!.isTomorrow).toBe(true);
    });

    it('returns null when no classes at all', async () => {
      const now = new Date('2025-08-11T10:00:00Z');
      const result = await service.getNextClass(defaultParams, now);

      expect(result).toBeNull();
    });

    it('returns null on holiday', async () => {
      vi.mocked(repo.isHoliday).mockResolvedValue(makeHoliday());

      const now = new Date('2025-08-15T10:00:00Z');
      const result = await service.getNextClass(defaultParams, now);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('upserts a schedule entry', async () => {
      const entry = makeEntry();
      await service.create(entry);

      expect(repo.upsertSchedule).toHaveBeenCalledWith(entry);
    });
  });

  describe('bulkCreate', () => {
    it('upserts multiple entries', async () => {
      const entries = [makeEntry(), makeEntry({ periodNumber: 2 })];
      vi.mocked(repo.upsertMany).mockResolvedValue(2);

      const count = await service.bulkCreate(entries);

      expect(count).toBe(2);
    });
  });

  describe('deleteByDay', () => {
    it('deletes entries for a day', async () => {
      vi.mocked(repo.deleteByParams).mockResolvedValue(3);

      const deleted = await service.deleteByDay('CSE', 4, 'A', 'Monday');

      expect(deleted).toBe(3);
      expect(repo.deleteByParams).toHaveBeenCalledWith({
        department: 'CSE', year: 4, section: 'A', dayOfWeek: 'Monday',
      });
    });
  });

  describe('getSubjectsByClass', () => {
    it('returns distinct subjects', async () => {
      vi.mocked(repo.getSubjectsByClass).mockResolvedValue(['DBMS', 'OS']);

      const subjects = await service.getSubjectsByClass('CSE', 4, 'A');

      expect(subjects).toEqual(['DBMS', 'OS']);
    });
  });

  describe('getHolidayOverrides', () => {
    it('returns holiday overrides', async () => {
      const holidays = [makeHoliday()];
      vi.mocked(repo.findHolidayOverrides).mockResolvedValue(holidays);

      const result = await service.getHolidayOverrides({
        department: 'CSE', year: 4, section: 'A', academicYear: '2025-26',
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('addHolidayOverride', () => {
    it('adds a holiday override', async () => {
      const input = {
        department: 'CSE', year: 4, section: 'A',
        date: new Date('2025-12-25'), reason: 'Christmas',
        academicYear: '2025-26',
      };
      const holiday = makeHoliday({ ...input, id: 'h2' });
      vi.mocked(repo.addHolidayOverride).mockResolvedValue(holiday);

      const result = await service.addHolidayOverride(input);

      expect(result.reason).toBe('Christmas');
    });
  });

  describe('removeHolidayOverride', () => {
    it('removes a holiday override', async () => {
      vi.mocked(repo.removeHolidayOverride).mockResolvedValue(1);

      const deleted = await service.removeHolidayOverride({
        department: 'CSE', year: 4, section: 'A',
        date: new Date('2025-12-25'), academicYear: '2025-26',
      });

      expect(deleted).toBe(1);
    });

    it('throws NotFoundError when no holiday found', async () => {
      vi.mocked(repo.removeHolidayOverride).mockResolvedValue(0);

      await expect(
        service.removeHolidayOverride({
          department: 'CSE', year: 4, section: 'A',
          date: new Date('2025-12-25'), academicYear: '2025-26',
        }),
      ).rejects.toThrow('No holiday override found');
    });
  });
});
