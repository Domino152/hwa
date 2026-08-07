import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { User } from '../../../src/database/models/User.js';
import { Fee } from '../../../src/database/models/Fee.js';
import { FeeStructure } from '../../../src/database/models/FeeStructure.js';
import { Installment } from '../../../src/database/models/Installment.js';
import { Payment } from '../../../src/database/models/Payment.js';
import { Receipt } from '../../../src/database/models/Receipt.js';
import { Scholarship } from '../../../src/database/models/Scholarship.js';
import { Fine } from '../../../src/database/models/Fine.js';
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

describe('Fees API', () => {
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

  describe('GET /api/v1/fees/student/:studentId', () => {
    it('returns latest fee for a student', async () => {
      await Fee.create({
        studentId: '22CSE001',
        feeType: 'Tuition',
        totalFee: 100000,
        paidAmount: 50000,
        remainingAmount: 50000,
        dueDate: new Date('2025-12-01'),
        status: 'partial',
        semester: 1,
        academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/fees/student/22CSE001')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.fee).not.toBeNull();
      expect(res.body.data.fee.feeType).toBe('Tuition');
      expect(res.body.data.hasData).toBe(true);
    });

    it('returns null for student with no fees', async () => {
      const res = await request(app)
        .get('/api/v1/fees/student/UNKNOWN')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasData).toBe(false);
    });
  });

  describe('GET /api/v1/fees/student/:studentId/all', () => {
    it('returns all fee records for a student', async () => {
      await Fee.create({
        studentId: '22CSE001', feeType: 'Tuition', totalFee: 100000, paidAmount: 100000, remainingAmount: 0,
        dueDate: new Date('2025-06-01'), status: 'paid', semester: 1, academicYear: '2024-25',
      });
      await Fee.create({
        studentId: '22CSE001', feeType: 'Hostel', totalFee: 80000, paidAmount: 40000, remainingAmount: 40000,
        dueDate: new Date('2025-12-01'), status: 'partial', semester: 1, academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/fees/student/22CSE001/all')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.fees).toHaveLength(2);
    });
  });

  describe('PUT /api/v1/fees/student/:studentId/payment', () => {
    it('updates payment for a fee record', async () => {
      await Fee.create({
        studentId: '22CSE001', feeType: 'Tuition', totalFee: 100000, paidAmount: 0, remainingAmount: 100000,
        dueDate: new Date('2025-12-01'), status: 'pending', semester: 1, academicYear: '2025-26',
      });

      const res = await request(app)
        .put('/api/v1/fees/student/22CSE001/payment?feeType=Tuition&semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ paidAmount: 50000 });

      expect(res.status).toBe(200);
      expect(res.body.data.fee).not.toBeNull();
    });
  });

  describe('GET /api/v1/fees/overdue', () => {
    it('returns overdue fees', async () => {
      await Fee.create({
        studentId: '22CSE001', feeType: 'Exam', totalFee: 5000, paidAmount: 0, remainingAmount: 5000,
        dueDate: new Date('2025-01-01'), status: 'pending', semester: 1, academicYear: '2025-26',
      });

      const res = await request(app)
        .get('/api/v1/fees/overdue?academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.fees).toBeDefined();
    });
  });

  // ============================================================
  // FEE STRUCTURE
  // ============================================================

  describe('Fee Structure', () => {
    let structureId: string;

    it('creates a fee structure', async () => {
      const res = await request(app)
        .post('/api/v1/fees/structures')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          code: 'TUITION',
          name: 'Tuition Fee',
          category: 'tuition',
          amount: 50000,
          frequency: 'semester',
          department: 'CSE',
          program: 'B.Tech',
          semester: 1,
          year: 1,
          academicYear: '2025-26',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('TUITION');
      structureId = res.body.data.id;
    });

    it('rejects duplicate fee structure', async () => {
      await request(app)
        .post('/api/v1/fees/structures')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          code: 'DUP',
          name: 'Dup',
          category: 'tuition',
          amount: 1000,
          frequency: 'one_time',
          department: 'CSE',
          program: 'B.Tech',
          academicYear: '2025-26',
        });

      const res = await request(app)
        .post('/api/v1/fees/structures')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          code: 'DUP',
          name: 'Dup',
          category: 'tuition',
          amount: 1000,
          frequency: 'one_time',
          department: 'CSE',
          program: 'B.Tech',
          academicYear: '2025-26',
        });
      expect(res.status).toBe(400);
    });

    it('retrieves fee structure by id and by code', async () => {
      const created = await FeeStructure.create({
        code: 'HOSTEL',
        name: 'Hostel Fee',
        category: 'hostel',
        amount: 80000,
        frequency: 'yearly',
        department: 'CSE',
        program: 'B.Tech',
        semester: null,
        year: null,
        academicYear: '2025-26',
        isActive: true,
        description: 'Annual hostel fee',
      });

      const byId = await request(app)
        .get(`/api/v1/fees/structures/${String(created._id)}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(byId.status).toBe(200);
      expect(byId.body.data.code).toBe('HOSTEL');

      const byCode = await request(app)
        .get('/api/v1/fees/structures/by-code?code=HOSTEL&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(byCode.status).toBe(200);
      expect(byCode.body.data.code).toBe('HOSTEL');
    });

    it('returns 404 for missing fee structure', async () => {
      const res = await request(app)
        .get('/api/v1/fees/structures/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(404);
    });

    it('updates and deletes a fee structure', async () => {
      const created = await FeeStructure.create({
        code: 'EXAM',
        name: 'Exam Fee',
        category: 'exam',
        amount: 5000,
        frequency: 'semester',
        department: 'CSE',
        program: 'B.Tech',
        semester: null,
        year: null,
        academicYear: '2025-26',
        isActive: true,
        description: null,
      });

      const update = await request(app)
        .put(`/api/v1/fees/structures/${String(created._id)}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ amount: 6000 });
      expect(update.status).toBe(200);
      expect(update.body.data.amount).toBe(6000);

      const del = await request(app)
        .delete(`/api/v1/fees/structures/${String(created._id)}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(del.status).toBe(200);
    });

    it('lists fee structures by department/program/semester', async () => {
      const byProgram = await request(app)
        .get('/api/v1/fees/structures/by-program?department=CSE&program=B.Tech&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(byProgram.status).toBe(200);
      expect(Array.isArray(byProgram.body.data.structures)).toBe(true);

      const byDeptSem = await request(app)
        .get('/api/v1/fees/structures/by-department-semester?department=CSE&semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(byDeptSem.status).toBe(200);
    });
  });

  // ============================================================
  // INSTALLMENTS
  // ============================================================

  describe('Installments', () => {
    let structureId: string;
    let installmentId: string;

    beforeEach(async () => {
      const created = await request(app)
        .post('/api/v1/fees/structures')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          code: 'INST_TUIT',
          name: 'Installment Tuition',
          category: 'tuition',
          amount: 50000,
          frequency: 'semester',
          department: 'CSE',
          program: 'B.Tech',
          semester: 1,
          year: 1,
          academicYear: '2025-26',
        });
      structureId = created.body.data.id;

      const installment = await request(app)
        .post('/api/v1/fees/installments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          feeStructureId: structureId,
          installmentNumber: 1,
          amount: 25000,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          semester: 1,
          academicYear: '2025-26',
        });
      installmentId = installment.body.data.id;
    });

    it('creates an installment', () => {
      expect(installmentId).toBeDefined();
    });

    it('bulk-creates installments', async () => {
      const res = await request(app)
        .post('/api/v1/fees/installments/bulk')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          semester: 1,
          academicYear: '2025-26',
          installments: [
            { feeStructureId: structureId, installmentNumber: 2, amount: 25000, dueDate: new Date().toISOString() },
            { feeStructureId: structureId, installmentNumber: 3, amount: 25000, dueDate: new Date().toISOString() },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body.data.created).toBe(2);
    });

    it('lists installments by student', async () => {
      const res = await request(app)
        .get('/api/v1/fees/installments/student/22CSE001?academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.installments.length).toBeGreaterThan(0);
    });

    it('lists installments by student and semester', async () => {
      const res = await request(app)
        .get('/api/v1/fees/installments/student/22CSE001?academicYear=2025-26&semester=1')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.installments.length).toBeGreaterThan(0);
    });

    it('deletes an installment', async () => {
      const res = await request(app)
        .delete(`/api/v1/fees/installments/${installmentId}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
    });
  });

  // ============================================================
  // PAYMENTS + RECEIPTS
  // ============================================================

  describe('Payments + Receipts', () => {
    let installmentId: string;
    let receiptNumber: string;

    beforeEach(async () => {
      const structure = await FeeStructure.create({
        code: 'PAY_TEST',
        name: 'Pay Test',
        category: 'tuition',
        amount: 50000,
        frequency: 'semester',
        department: 'CSE',
        program: 'B.Tech',
        semester: 1,
        year: 1,
        academicYear: '2025-26',
        isActive: true,
        description: null,
      });

      const inst = await Installment.create({
        studentId: '22CSE001',
        feeStructureId: structure._id,
        installmentNumber: 1,
        feeCode: 'PAY_TEST',
        feeName: 'Pay Test',
        category: 'tuition',
        amount: 50000,
        paidAmount: 0,
        remainingAmount: 50000,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paidDate: null,
        status: 'upcoming',
        semester: 1,
        academicYear: '2025-26',
        lateFine: 0,
        notes: null,
      });
      installmentId = String(inst._id);
    });

    it('records a payment and generates a receipt', async () => {
      const res = await request(app)
        .post('/api/v1/fees/payments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          installmentId,
          amount: 25000,
          method: 'upi',
          transactionId: 'TXN123',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.payment.amount).toBe(25000);
      expect(res.body.data.receipt.amount).toBe(25000);
      receiptNumber = res.body.data.payment.receiptNumber;
    });

    it('retrieves payment by receipt number', async () => {
      await request(app)
        .post('/api/v1/fees/payments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          installmentId,
          amount: 25000,
          method: 'cash',
        }).then((res) => {
          receiptNumber = res.body.data.payment.receiptNumber;
        });

      const res = await request(app)
        .get(`/api/v1/fees/payments/by-receipt/${receiptNumber}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.receiptNumber).toBe(receiptNumber);
    });

    it('retrieves receipt by number', async () => {
      const paymentRes = await request(app)
        .post('/api/v1/fees/payments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          installmentId,
          amount: 10000,
          method: 'cash',
        });
      receiptNumber = paymentRes.body.data.payment.receiptNumber;

      const res = await request(app)
        .get(`/api/v1/fees/receipts/${receiptNumber}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.receiptNumber).toBe(receiptNumber);
    });

    it('lists payments by student', async () => {
      await request(app)
        .post('/api/v1/fees/payments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          installmentId,
          amount: 10000,
          method: 'cash',
        });

      const res = await request(app)
        .get('/api/v1/fees/payments/student/22CSE001')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.payments.length).toBe(1);
    });

    it('lists receipts by student', async () => {
      await request(app)
        .post('/api/v1/fees/payments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          installmentId,
          amount: 10000,
          method: 'cash',
        });

      const res = await request(app)
        .get('/api/v1/fees/receipts/student/22CSE001')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.receipts.length).toBe(1);
    });

    it('rejects payment exceeding remaining amount', async () => {
      const res = await request(app)
        .post('/api/v1/fees/payments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          installmentId,
          amount: 100000,
          method: 'cash',
        });
      expect(res.status).toBe(400);
    });

    it('refunds a payment', async () => {
      const paymentRes = await request(app)
        .post('/api/v1/fees/payments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          installmentId,
          amount: 5000,
          method: 'cash',
        });
      const paymentId = paymentRes.body.data.payment.id;

      const res = await request(app)
        .post(`/api/v1/fees/payments/${paymentId}/refund`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('refunded');
    });

    it('validates required payment fields', async () => {
      const res = await request(app)
        .post('/api/v1/fees/payments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ amount: -10, method: 'cash' });
      expect(res.status).toBe(400);
    });
  });

  // ============================================================
  // PENDING AMOUNT
  // ============================================================

  describe('Pending Amount', () => {
    it('returns pending summary', async () => {
      const structure = await FeeStructure.create({
        code: 'PEND_TEST',
        name: 'Pend Test',
        category: 'tuition',
        amount: 50000,
        frequency: 'semester',
        department: 'CSE',
        program: 'B.Tech',
        semester: 1,
        year: 1,
        academicYear: '2025-26',
        isActive: true,
        description: null,
      });
      await Installment.create({
        studentId: '22CSE001',
        feeStructureId: structure._id,
        installmentNumber: 1,
        feeCode: 'PEND_TEST',
        feeName: 'Pend Test',
        category: 'tuition',
        amount: 50000,
        paidAmount: 0,
        remainingAmount: 50000,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paidDate: null,
        status: 'upcoming',
        semester: 1,
        academicYear: '2025-26',
        lateFine: 0,
        notes: null,
      });

      const res = await request(app)
        .get('/api/v1/fees/pending/22CSE001?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.totalPending).toBe(50000);
      expect(res.body.data.installmentCount).toBe(1);
    });
  });

  // ============================================================
  // PAYMENT HISTORY
  // ============================================================

  describe('Payment History', () => {
    it('returns payment history with aggregates', async () => {
      const res = await request(app)
        .get('/api/v1/fees/history/22CSE001')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.totalPaid).toBeDefined();
      expect(res.body.data.byMethod).toBeDefined();
    });
  });

  // ============================================================
  // SCHOLARSHIPS
  // ============================================================

  describe('Scholarships', () => {
    let scholarshipId: string;

    it('creates a scholarship', async () => {
      const res = await request(app)
        .post('/api/v1/fees/scholarships')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          scholarshipName: 'Merit Scholarship',
          type: 'merit',
          amount: 10000,
          percentage: 20,
          provider: 'Government',
          validFrom: new Date(Date.now() - 1000).toISOString(),
          validUntil: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
          semester: 1,
          academicYear: '2025-26',
        });
      expect(res.status).toBe(201);
      scholarshipId = res.body.data.id;
    });

    it('lists scholarships by student', async () => {
      await request(app)
        .post('/api/v1/fees/scholarships')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          scholarshipName: 'Need-based',
          type: 'need_based',
          amount: 5000,
          provider: 'NGO',
          validFrom: new Date(Date.now() - 1000).toISOString(),
          validUntil: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
          academicYear: '2025-26',
        });

      const res = await request(app)
        .get('/api/v1/fees/scholarships/student/22CSE001?academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.scholarships.length).toBeGreaterThan(0);
    });

    it('lists active scholarships filtered by semester', async () => {
      await request(app)
        .post('/api/v1/fees/scholarships')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          scholarshipName: 'Active',
          type: 'merit',
          amount: 1000,
          provider: 'Test',
          validFrom: new Date(Date.now() - 1000).toISOString(),
          validUntil: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
          semester: 1,
          academicYear: '2025-26',
        });

      const res = await request(app)
        .get('/api/v1/fees/scholarships/student/22CSE001?semester=1&academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.scholarships.length).toBeGreaterThan(0);
    });

    it('revokes a scholarship', async () => {
      const create = await request(app)
        .post('/api/v1/fees/scholarships')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          scholarshipName: 'To Revoke',
          type: 'merit',
          amount: 1000,
          provider: 'Test',
          validFrom: new Date(Date.now() - 1000).toISOString(),
          validUntil: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
          academicYear: '2025-26',
        });
      const id = create.body.data.id;

      const res = await request(app)
        .post(`/api/v1/fees/scholarships/${id}/revoke`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ reason: 'Policy violation' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('revoked');
    });

    it('validates scholarship fields', async () => {
      const res = await request(app)
        .post('/api/v1/fees/scholarships')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          scholarshipName: 'Invalid',
          type: 'merit',
          amount: 1000,
          provider: 'Test',
          validFrom: new Date(Date.now() + 1000).toISOString(),
          validUntil: new Date(Date.now() - 1000).toISOString(),
          academicYear: '2025-26',
        });
      expect(res.status).toBe(400);
    });

    it('rejects percentage out of range', async () => {
      const res = await request(app)
        .post('/api/v1/fees/scholarships')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          scholarshipName: 'Bad Pct',
          type: 'merit',
          amount: 1000,
          percentage: 150,
          provider: 'Test',
          validFrom: new Date(Date.now() - 1000).toISOString(),
          validUntil: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
          academicYear: '2025-26',
        });
      expect(res.status).toBe(400);
    });

    it('returns 404 for missing scholarship', async () => {
      const res = await request(app)
        .get('/api/v1/fees/scholarships/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ============================================================
  // FINES
  // ============================================================

  describe('Fines', () => {
    let fineId: string;

    it('creates a fine', async () => {
      const res = await request(app)
        .post('/api/v1/fees/fines')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          reason: 'late_payment',
          description: 'Late fee submission',
          amount: 500,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          semester: 1,
          academicYear: '2025-26',
        });
      expect(res.status).toBe(201);
      fineId = res.body.data.id;
    });

    it('lists fines by student', async () => {
      await request(app)
        .post('/api/v1/fees/fines')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          reason: 'late_payment',
          description: 'Late fee',
          amount: 500,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          semester: 1,
          academicYear: '2025-26',
        });

      const res = await request(app)
        .get('/api/v1/fees/fines/student/22CSE001?academicYear=2025-26')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.fines.length).toBeGreaterThan(0);
    });

    it('waives a fine', async () => {
      const create = await request(app)
        .post('/api/v1/fees/fines')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          reason: 'late_payment',
          description: 'Late fee',
          amount: 500,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          semester: 1,
          academicYear: '2025-26',
        });
      fineId = create.body.data.id;

      const res = await request(app)
        .post(`/api/v1/fees/fines/${fineId}/waive`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ waivedBy: 'admin', reason: 'Good student' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('waived');
    });

    it('records a fine payment', async () => {
      const create = await request(app)
        .post('/api/v1/fees/fines')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          reason: 'late_payment',
          description: 'Late fee',
          amount: 500,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          semester: 1,
          academicYear: '2025-26',
        });
      fineId = create.body.data.id;

      const res = await request(app)
        .post(`/api/v1/fees/fines/${fineId}/pay`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ amount: 200, method: 'cash' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('partial');
    });

    it('rejects negative fine amount', async () => {
      const res = await request(app)
        .post('/api/v1/fees/fines')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          reason: 'late_payment',
          description: 'Test',
          amount: -100,
          dueDate: new Date().toISOString(),
          semester: 1,
          academicYear: '2025-26',
        });
      expect(res.status).toBe(400);
    });

    it('returns 404 for missing fine', async () => {
      const res = await request(app)
        .get('/api/v1/fees/fines/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ============================================================
  // DUE-REMINDER NOTIFICATIONS
  // ============================================================

  describe('Due Reminders', () => {
    it('sends due reminders for a single student', async () => {
      const structure = await FeeStructure.create({
        code: 'REMIND_TEST',
        name: 'Remind Test',
        category: 'tuition',
        amount: 50000,
        frequency: 'semester',
        department: 'CSE',
        program: 'B.Tech',
        semester: 1,
        year: 1,
        academicYear: '2025-26',
        isActive: true,
        description: null,
      });
      await Installment.create({
        studentId: '22CSE001',
        feeStructureId: structure._id,
        installmentNumber: 1,
        feeCode: 'REMIND_TEST',
        feeName: 'Remind Test',
        category: 'tuition',
        amount: 50000,
        paidAmount: 0,
        remainingAmount: 50000,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        paidDate: null,
        status: 'overdue',
        semester: 1,
        academicYear: '2025-26',
        lateFine: 0,
        notes: null,
      });

      const res = await request(app)
        .post('/api/v1/fees/reminders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: '22CSE001',
          semester: 1,
          academicYear: '2025-26',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.scope).toBe('student');
    });

    it('sends due reminders for all students', async () => {
      const res = await request(app)
        .post('/api/v1/fees/reminders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          semester: 1,
          academicYear: '2025-26',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.scope).toBe('all');
    });
  });

  // ============================================================
  // AUTH GATE
  // ============================================================

  describe('Auth gate', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/fees/student/22CSE001');
      expect(res.status).toBe(401);
    });
  });
});
