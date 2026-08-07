import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IStudentRepository, StudentFilter, PaginationOptions, PaginatedResult } from '../../src/repositories/student.repository.js';
import type { StudentRecord } from '../../src/repositories/types.js';
import { StudentService, type CreateStudentInput } from '../../src/modules/students/student.service.js';

function createMockStudent(overrides: Partial<StudentRecord> = {}): StudentRecord {
  return {
    id: '507f1f77bcf86cd799439011',
    userId: '507f1f77bcf86cd799439012',
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
    parentId: null,
    whatsappNumber: '9876543210',
    parentWhatsappNumber: null,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockRepo(): IStudentRepository {
  return {
    findById: vi.fn(),
    findByStudentId: vi.fn(),
    findByRegisterNumber: vi.fn(),
    findByUserId: vi.fn(),
    find: vi.fn(),
    findByDepartment: vi.fn(),
    findByClass: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };
}

describe('StudentService', () => {
  let service: StudentService;
  let repo: IStudentRepository;

  beforeEach(() => {
    repo = createMockRepo();
    service = new StudentService(repo);
  });

  describe('getById', () => {
    it('should return a student by id', async () => {
      const mock = createMockStudent();
      vi.mocked(repo.findById).mockResolvedValue(mock);

      const result = await service.getById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mock);
      expect(repo.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw NotFoundError if student not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow('Student not found');
    });
  });

  describe('getByStudentId', () => {
    it('should return a student by studentId', async () => {
      const mock = createMockStudent();
      vi.mocked(repo.findByStudentId).mockResolvedValue(mock);

      const result = await service.getByStudentId('22CSE001');

      expect(result).toEqual(mock);
      expect(repo.findByStudentId).toHaveBeenCalledWith('22CSE001');
    });

    it('should throw NotFoundError if student not found', async () => {
      vi.mocked(repo.findByStudentId).mockResolvedValue(null);

      await expect(service.getByStudentId('nonexistent')).rejects.toThrow('Student not found');
    });
  });

  describe('getByRegisterNumber', () => {
    it('should return a student by registerNumber', async () => {
      const mock = createMockStudent();
      vi.mocked(repo.findByRegisterNumber).mockResolvedValue(mock);

      const result = await service.getByRegisterNumber('REG2022001');

      expect(result).toEqual(mock);
      expect(repo.findByRegisterNumber).toHaveBeenCalledWith('REG2022001');
    });

    it('should throw NotFoundError if student not found', async () => {
      vi.mocked(repo.findByRegisterNumber).mockResolvedValue(null);

      await expect(service.getByRegisterNumber('nonexistent')).rejects.toThrow('Student not found');
    });
  });

  describe('getByUserId', () => {
    it('should return a student by userId', async () => {
      const mock = createMockStudent();
      vi.mocked(repo.findByUserId).mockResolvedValue(mock);

      const result = await service.getByUserId('507f1f77bcf86cd799439012');

      expect(result).toEqual(mock);
      expect(repo.findByUserId).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
    });

    it('should return null if student not found', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue(null);

      const result = await service.getByUserId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return paginated results', async () => {
      const mockResult: PaginatedResult<StudentRecord> = {
        data: [createMockStudent()],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      vi.mocked(repo.find).mockResolvedValue(mockResult);

      const result = await service.list({ department: 'CSE' }, { page: 1, limit: 20 });

      expect(result).toEqual(mockResult);
      expect(repo.find).toHaveBeenCalledWith({ department: 'CSE' }, { page: 1, limit: 20 });
    });
  });

  describe('getByDepartment', () => {
    it('should return students by department', async () => {
      const mock = [createMockStudent()];
      vi.mocked(repo.findByDepartment).mockResolvedValue(mock);

      const result = await service.getByDepartment('CSE');

      expect(result).toEqual(mock);
      expect(repo.findByDepartment).toHaveBeenCalledWith('CSE');
    });
  });

  describe('getByClass', () => {
    it('should return students by class', async () => {
      const mock = [createMockStudent()];
      vi.mocked(repo.findByClass).mockResolvedValue(mock);

      const result = await service.getByClass('CSE', 4, 'A');

      expect(result).toEqual(mock);
      expect(repo.findByClass).toHaveBeenCalledWith('CSE', 4, 'A');
    });
  });

  describe('create', () => {
    it('should create a new student', async () => {
      const input: CreateStudentInput = {
        userId: '507f1f77bcf86cd799439012',
        studentId: '22CSE002',
        registerNumber: 'REG2022002',
        rollNumber: 'R002',
        fullName: 'Jane Doe',
        email: 'jane@hits.edu',
        phone: '9876543211',
        gender: 'female',
        dateOfBirth: new Date('2001-05-20'),
        department: 'CSE',
        program: 'B.Tech',
        semester: 4,
        section: 'A',
        batch: '2022-2026',
        advisor: 'Dr. Smith',
      };

      const mock = createMockStudent({ ...input, id: 'newid', isActive: true, status: 'active' } as StudentRecord);
      vi.mocked(repo.findByStudentId).mockResolvedValue(null);
      vi.mocked(repo.findByRegisterNumber).mockResolvedValue(null);
      vi.mocked(repo.create).mockResolvedValue(mock);

      const result = await service.create(input);

      expect(result).toEqual(mock);
      expect(repo.create).toHaveBeenCalled();
    });

    it('should throw ConflictError if studentId already exists', async () => {
      const input: CreateStudentInput = {
        userId: '507f1f77bcf86cd799439012',
        studentId: '22CSE001',
        registerNumber: 'REG2022002',
        rollNumber: 'R002',
        fullName: 'Jane Doe',
        email: 'jane@hits.edu',
        phone: '9876543211',
        gender: 'female',
        dateOfBirth: new Date('2001-05-20'),
        department: 'CSE',
        program: 'B.Tech',
        semester: 4,
        section: 'A',
        batch: '2022-2026',
        advisor: 'Dr. Smith',
      };

      vi.mocked(repo.findByStudentId).mockResolvedValue(createMockStudent());

      await expect(service.create(input)).rejects.toThrow('already exists');
    });

    it('should throw ConflictError if registerNumber already exists', async () => {
      const input: CreateStudentInput = {
        userId: '507f1f77bcf86cd799439012',
        studentId: '22CSE002',
        registerNumber: 'REG2022001',
        rollNumber: 'R002',
        fullName: 'Jane Doe',
        email: 'jane@hits.edu',
        phone: '9876543211',
        gender: 'female',
        dateOfBirth: new Date('2001-05-20'),
        department: 'CSE',
        program: 'B.Tech',
        semester: 4,
        section: 'A',
        batch: '2022-2026',
        advisor: 'Dr. Smith',
      };

      vi.mocked(repo.findByStudentId).mockResolvedValue(null);
      vi.mocked(repo.findByRegisterNumber).mockResolvedValue(createMockStudent());

      await expect(service.create(input)).rejects.toThrow('already exists');
    });
  });

  describe('update', () => {
    it('should update a student', async () => {
      const mock = createMockStudent({ fullName: 'John Updated' });
      vi.mocked(repo.findById).mockResolvedValue(createMockStudent());
      vi.mocked(repo.update).mockResolvedValue(mock);

      const result = await service.update('507f1f77bcf86cd799439011', { fullName: 'John Updated' });

      expect(result).toEqual(mock);
      expect(repo.update).toHaveBeenCalledWith('507f1f77bcf86cd799439011', { fullName: 'John Updated' });
    });

    it('should throw NotFoundError if student not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.update('nonexistent', { fullName: 'Test' })).rejects.toThrow('Student not found');
    });
  });

  describe('delete', () => {
    it('should soft delete a student', async () => {
      vi.mocked(repo.findById).mockResolvedValue(createMockStudent());
      vi.mocked(repo.delete).mockResolvedValue(true);

      await service.delete('507f1f77bcf86cd799439011');

      expect(repo.delete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw NotFoundError if student not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow('Student not found');
    });
  });

  describe('count', () => {
    it('should return count of students matching filter', async () => {
      vi.mocked(repo.count).mockResolvedValue(42);

      const result = await service.count({ department: 'CSE' });

      expect(result).toBe(42);
      expect(repo.count).toHaveBeenCalledWith({ department: 'CSE' });
    });
  });
});
