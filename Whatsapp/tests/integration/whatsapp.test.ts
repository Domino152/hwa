import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/database/models/Conversation.js', () => {
  const queryChain = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
  };
  return {
    Conversation: {
      find: vi.fn().mockReturnValue(queryChain),
      findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      countDocuments: vi.fn().mockResolvedValue(0),
      findOneAndUpdate: vi.fn().mockResolvedValue({
        _id: 'mock-conversation-id',
        phone: 'mock',
        jid: 'mock',
        unreadCount: 0,
      }),
    },
  };
});

vi.mock('../../src/database/models/Message.js', () => {
  const queryChain = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
  };
  return {
    Message: {
      find: vi.fn().mockReturnValue(queryChain),
      countDocuments: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ _id: 'mock-message-id' }),
    },
  };
});

import request from 'supertest';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('WhatsApp Endpoints', () => {
  it('GET /api/v1/whatsapp/connection-status should return 200', async () => {
    const res = await request(app).get('/api/v1/whatsapp/connection-status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('state');
  });

  it('POST /api/v1/whatsapp/send-message should reject empty body', async () => {
    const res = await request(app)
      .post('/api/v1/whatsapp/send-message')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/whatsapp/send-message should reject missing message', async () => {
    const res = await request(app)
      .post('/api/v1/whatsapp/send-message')
      .send({ phone: '+91 7530063885' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/whatsapp/send-message should reject message exceeding 4096 chars', async () => {
    const res = await request(app)
      .post('/api/v1/whatsapp/send-message')
      .send({ phone: '917530063885', message: 'a'.repeat(4097) });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/whatsapp/logout should return 200', async () => {
    const res = await request(app).post('/api/v1/whatsapp/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('WhatsApp Inbox Endpoints', () => {
  it('GET /api/v1/whatsapp/conversations should return 200 with empty list', async () => {
    const res = await request(app).get('/api/v1/whatsapp/conversations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('conversations');
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('page');
    expect(res.body.data).toHaveProperty('limit');
  });

  it('GET /api/v1/whatsapp/conversations should validate query params', async () => {
    const res = await request(app)
      .get('/api/v1/whatsapp/conversations?page=0&limit=500');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/whatsapp/messages/:phone should return 200 with empty list for unknown phone', async () => {
    const res = await request(app).get('/api/v1/whatsapp/messages/999999999999');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.messages).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });

  it('GET /api/v1/whatsapp/messages/:phone should require phone param', async () => {
    const res = await request(app).get('/api/v1/whatsapp/messages/');
    expect(res.status).toBe(404);
  });
});
