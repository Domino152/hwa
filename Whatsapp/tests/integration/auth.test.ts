import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSelect, mockFindById, mockSelectForId } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockFindById: vi.fn(),
  mockSelectForId: vi.fn(),
}));

vi.mock('../../src/database/models/User.js', () => ({
  User: {
    findOne: vi.fn().mockReturnValue({ select: mockSelect }),
    findById: vi.fn().mockReturnValue({ select: mockSelectForId }),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../../src/modules/auth/password.service.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
  comparePassword: vi.fn(),
}));

import request from 'supertest';
import { createApp } from '../../src/app.js';
import { comparePassword } from '../../src/modules/auth/password.service.js';
import { signToken } from '../../src/modules/auth/token.service.js';

const app = createApp();

describe('Auth Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 400 for empty body', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: '22CSE001', role: 'student' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: '22CSE001', password: 'student123', role: 'admin' });
      expect(res.status).toBe(400);
    });

    it('returns 401 for wrong credentials', async () => {
      mockSelect.mockResolvedValue(null);
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: '22CSE001', password: 'wrong123', role: 'student' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 with token for valid credentials', async () => {
      (comparePassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      mockSelect.mockResolvedValue({
        _id: 'user123',
        fullName: 'Arjun Sharma',
        username: '22CSE001',
        role: 'student',
        studentId: '22CSE001',
        department: 'CSE',
        year: 4,
        section: 'A',
        whatsappNumber: null,
        passwordHash: '$2b$10$hashedpassword',
      });
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: '22CSE001', password: 'student123', role: 'student' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.username).toBe('22CSE001');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });

    it('returns 200 with user for valid token', async () => {
      const token = signToken({
        userId: 'user123',
        username: '22CSE001',
        role: 'student',
      });
      mockSelectForId.mockResolvedValue({
        _id: 'user123',
        fullName: 'Arjun Sharma',
        username: '22CSE001',
        role: 'student',
        studentId: '22CSE001',
        department: 'CSE',
        year: 4,
        section: 'A',
        whatsappNumber: null,
        isActive: true,
      });
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/link-whatsapp', () => {
    it('returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/link-whatsapp')
        .send({ phone: '917530063885' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/status', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/status');
      expect(res.status).toBe(401);
    });
  });
});
