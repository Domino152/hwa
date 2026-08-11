import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { MONGOOSE_DEFAULT_OPTIONS } from '../config/constants.js';
import logger from '../shared/utils/logger.js';

let isConnected = false;
let isConnecting = false;
let listenersRegistered = false;
let disconnectRequested = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const INITIAL_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

function getRetryDelay(attempt: number): number {
  const exponent = Math.min(attempt, 10);
  const delay = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, exponent), MAX_RETRY_DELAY_MS);
  return delay + Math.random() * 0.1 * delay;
}

function registerConnectionListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    isConnected = true;
    isConnecting = false;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected; Mongoose will attempt to reconnect');
  });
}

export async function connectDB(attempt = 0): Promise<void> {
  disconnectRequested = false;
  if (isConnected || mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    isConnected = true;
    return;
  }
  if (isConnecting) return;

  isConnecting = true;
  mongoose.set('strictQuery', true);
  registerConnectionListeners();

  try {
    await mongoose.connect(config.MONGO_URI, MONGOOSE_DEFAULT_OPTIONS);
  } catch (err) {
    isConnecting = false;
    if (disconnectRequested || retryTimer) return;

    const delay = getRetryDelay(attempt);
    logger.error(
      { err, attempt: attempt + 1, delayMs: Math.round(delay) },
      'MongoDB connection failed; application remains available and will retry',
    );
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void connectDB(attempt + 1);
    }, delay);
    retryTimer.unref?.();
  }
}

export async function disconnectDB(): Promise<void> {
  disconnectRequested = true;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected) {
    await mongoose.disconnect();
  }
  isConnected = false;
  isConnecting = false;
  logger.info('MongoDB disconnected gracefully');
}

export function isDBConnected(): boolean {
  return isConnected;
}
