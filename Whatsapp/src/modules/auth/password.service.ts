import bcrypt from 'bcrypt';
import { config } from '../../config/index.js';

const SALT_ROUNDS = config.BCRYPT_ROUNDS;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
