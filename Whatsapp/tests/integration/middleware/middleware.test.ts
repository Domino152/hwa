import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { validate } from '../../../src/middleware/validate.js';
import { errorHandler } from '../../../src/middleware/error-handler.js';
import { notFoundHandler } from '../../../src/middleware/not-found.js';
import { asyncHandler } from '../../../src/middleware/async-handler.js';
import { requestLogger } from '../../../src/middleware/request-logger.js';
import { ValidationError, NotFoundError, ForbiddenError, DatabaseError, AppError } from '../../../src/shared/utils/errors.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  return app;
}

describe('validate middleware', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it('passes valid body to next middleware', async () => {
    const app = createTestApp();
    app.post('/test', validate(schema), (req, res) => {
      res.json({ ok: true, data: req.body });
    });
    app.use(errorHandler);

    const res = await request(app).post('/test').send({ name: 'Alice', age: 25 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe('Alice');
  });

  it('returns 400 for invalid body', async () => {
    const app = createTestApp();
    app.post('/test', validate(schema), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    const res = await request(app).post('/test').send({ name: '', age: -1 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('validates query params', async () => {
    const querySchema = z.object({
      page: z.coerce.number().int().positive(),
    });

    const app = createTestApp();
    app.get('/test', validate(querySchema, 'query'), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    const res = await request(app).get('/test?page=0');
    expect(res.status).toBe(400);
  });

  it('validates route params', async () => {
    const paramsSchema = z.object({
      id: z.string().min(1),
    });

    const app = createTestApp();
    app.get('/test/:id', validate(paramsSchema, 'params'), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    const res = await request(app).get('/test/');
    expect(res.status).toBe(404);
  });
});

describe('errorHandler middleware', () => {
  it('handles AppError with correct status code', async () => {
    const app = createTestApp();
    app.get('/test', (_req, _res, next) => {
      next(new AppError('Custom error', 418, 'TEAPOT'));
    });
    app.use(errorHandler);

    const res = await request(app).get('/test');
    expect(res.status).toBe(418);
    expect(res.body.error.code).toBe('TEAPOT');
    expect(res.body.error.message).toBe('Custom error');
  });

  it('handles ValidationError with 400', async () => {
    const app = createTestApp();
    app.get('/test', (_req, _res, next) => {
      next(new ValidationError('Bad input', { field: ['Required'] }));
    });
    app.use(errorHandler);

    const res = await request(app).get('/test');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('handles NotFoundError with 404', async () => {
    const app = createTestApp();
    app.get('/test', (_req, _res, next) => {
      next(new NotFoundError('Widget'));
    });
    app.use(errorHandler);

    const res = await request(app).get('/test');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('handles ForbiddenError with 403', async () => {
    const app = createTestApp();
    app.get('/test', (_req, _res, next) => {
      next(new ForbiddenError('Access denied'));
    });
    app.use(errorHandler);

    const res = await request(app).get('/test');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('handles DatabaseError with 500', async () => {
    const app = createTestApp();
    app.get('/test', (_req, _res, next) => {
      next(new DatabaseError('Connection lost'));
    });
    app.use(errorHandler);

    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('DATABASE_ERROR');
    expect(res.body.error.message).toBe('Connection lost');
  });

  it('handles generic Error with 500', async () => {
    const app = createTestApp();
    app.get('/test', (_req, _res, next) => {
      next(new Error('Something broke'));
    });
    app.use(errorHandler);

    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('Internal server error');
  });

  it('includes requestId in error response', async () => {
    const app = createTestApp();
    app.get('/test', (_req, _res, next) => {
      next(new NotFoundError('Item'));
    });
    app.use(errorHandler);

    const res = await request(app).get('/test');
    expect(res.body.requestId).toBeDefined();
  });
});

describe('notFoundHandler middleware', () => {
  it('returns 404 for unknown routes', async () => {
    const app = createTestApp();
    app.use(notFoundHandler);
    app.use(errorHandler);

    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('GET');
    expect(res.body.error.message).toContain('/api/v1/nonexistent');
  });
});

describe('asyncHandler middleware', () => {
  it('catches async errors and passes to error handler', async () => {
    const app = createTestApp();
    app.get(
      '/test',
      asyncHandler(async () => {
        throw new Error('Async error');
      }),
    );
    app.use(errorHandler);

    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('passes through successful async handlers', async () => {
    const app = createTestApp();
    app.get(
      '/test',
      asyncHandler(async (_req, res) => {
        res.json({ ok: true });
      }),
    );
    app.use(errorHandler);

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('requestLogger middleware', () => {
  it('assigns requestId to request and response', async () => {
    let capturedRequestId: string | undefined;
    const app = createTestApp();
    app.get('/test', (req, res) => {
      capturedRequestId = req.requestId;
      res.json({ requestId: req.requestId });
    });

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.requestId).toBeDefined();
    expect(capturedRequestId).toBeDefined();
    expect(res.body.requestId).toBe(capturedRequestId);
  });
});
