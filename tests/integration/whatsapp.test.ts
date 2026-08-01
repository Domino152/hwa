import { describe, it, expect } from 'vitest';
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
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
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
