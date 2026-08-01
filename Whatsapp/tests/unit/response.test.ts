import { describe, it, expect, vi } from 'vitest';
import { sendSuccess, sendError } from '../../src/shared/utils/response.js';
import { AppError, NotFoundError } from '../../src/shared/utils/errors.js';

describe('Response Utilities', () => {
  function createMockRes() {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: { requestId: 'test-uuid-123' },
    };
    return res as any;
  }

  describe('sendSuccess', () => {
    it('should send success response with default 200 status', () => {
      const res = createMockRes();
      sendSuccess(res, { name: 'test' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { name: 'test' },
          requestId: 'test-uuid-123',
        }),
      );
    });

    it('should send success with custom status code', () => {
      const res = createMockRes();
      sendSuccess(res, { id: 1 }, 201);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('sendError', () => {
    it('should send error response for AppError', () => {
      const res = createMockRes();
      const error = new NotFoundError('User');
      sendError(res, error);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'User not found',
          }),
        }),
      );
    });

    it('should send 500 for generic errors', () => {
      const res = createMockRes();
      sendError(res, new Error('Something broke'));
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
