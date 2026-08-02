import { describe, it, expect } from 'vitest';
import { validateEnv } from '../../src/config/env.schema.js';

describe('Config', () => {
  it('should parse valid environment variables', () => {
    const env = {
      NODE_ENV: 'development',
      PORT: '3000',
      MONGO_URI: 'mongodb://localhost:27017/test',
      CORS_ORIGINS: 'http://localhost:3000',
      LOG_LEVEL: 'info',
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX: '100',
      WA_SESSION_DIR: './auth_info',
      JWT_SECRET: 'test-secret-key-at-least-32-chars-long!!',
    };

    const result = validateEnv(env);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.MONGO_URI).toBe('mongodb://localhost:27017/test');
  });

  it('should fail with invalid PORT', () => {
    const env = {
      NODE_ENV: 'development',
      PORT: '-1',
      MONGO_URI: 'mongodb://localhost:27017/test',
    };

    expect(() => validateEnv(env)).toThrow();
  });
});
