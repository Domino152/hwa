import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, type TokenPayload } from '../../src/modules/auth/token.service.js';

describe('Token Service', () => {
  const payload: TokenPayload = {
    userId: 'user123',
    username: '22CSE001',
    role: 'student',
  };

  it('signs a token', () => {
    const token = signToken(payload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('verifies a valid token', () => {
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.username).toBe(payload.username);
    expect(decoded.role).toBe(payload.role);
  });

  it('throws for invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow();
  });

  it('throws for expired token', async () => {
    const jwt = await import('jsonwebtoken');
    const shortLived = jwt.default.sign(
      { ...payload, iat: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_SECRET!,
      { expiresIn: '-1s' },
    );
    expect(() => verifyToken(shortLived)).toThrow();
  });
});
