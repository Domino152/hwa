import dotenv from 'dotenv';
import { validateEnv, type Env } from './env.schema.js';

dotenv.config();

export const config: Env = validateEnv(process.env as Record<string, unknown>);
