import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../../src/modules/auth/password.service.js';

describe('Password Service', () => {
  it('hashes a password', async () => {
    const hash = await hashPassword('testpass');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('testpass');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('returns true for matching password', async () => {
    const hash = await hashPassword('mypassword');
    const match = await comparePassword('mypassword', hash);
    expect(match).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('mypassword');
    const match = await comparePassword('wrongpassword', hash);
    expect(match).toBe(false);
  });

  it('generates different hashes for same password', async () => {
    const hash1 = await hashPassword('samepass');
    const hash2 = await hashPassword('samepass');
    expect(hash1).not.toBe(hash2);
  });
});
