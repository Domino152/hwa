import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('Health Endpoints', () => {
  it('GET /api/v1/health should return 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('GET /api/v1/live should return 200 with memory stats', async () => {
    const res = await request(app).get('/api/v1/live');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('alive');
    expect(res.body.data).toHaveProperty('memory');
    expect(res.body.data).toHaveProperty('uptime');
  });
});
