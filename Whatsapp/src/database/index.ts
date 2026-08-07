import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { MONGOOSE_DEFAULT_OPTIONS } from '../config/constants.js';
import logger from '../shared/utils/logger.js';

let isConnected = false;
let isConnecting = false;

const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

function getRetryDelay(attempt: number): number {
  const delay = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt), MAX_RETRY_DELAY_MS);
  const jitter = Math.random() * 0.1 * delay;
  return delay + jitter;
}

export async function connectDB(attempt = 0): Promise<void> {
  if (isConnected) {
    logger.info('MongoDB already connected');
    return;
  }

  if (isConnecting) {
    logger.info('MongoDB connection in progress');
    return;
  }

  isConnecting = true;

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    isConnected = true;
    isConnecting = false;
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  try {
    await mongoose.connect(config.MONGO_URI, MONGOOSE_DEFAULT_OPTIONS);
  } catch (err) {
    isConnecting = false;

    if (attempt < MAX_RETRY_ATTEMPTS - 1) {
      const delay = getRetryDelay(attempt);
      logger.warn(
        { attempt: attempt + 1, maxAttempts: MAX_RETRY_ATTEMPTS, delayMs: Math.round(delay) },
        'MongoDB connection failed — retrying',
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB(attempt + 1);
    }

    logger.fatal({ err, attempts: MAX_RETRY_ATTEMPTS }, 'Failed to connect to MongoDB after max retries');
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('MongoDB disconnected gracefully');
}

export function isDBConnected(): boolean {
  return isConnected;
}
