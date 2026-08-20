import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { MONGOOSE_DEFAULT_OPTIONS } from '../config/constants.js';
import logger from '../shared/utils/logger.js';

let isConnected = false;
let isConnecting = false;
let listenersRegistered = false;
let disconnectRequested = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let lastConnectionCheck = 0;
let lastConnectionState: 0 | 1 | 2 = 0;
const CONNECTION_CHECK_TTL_MS = 5_000;

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
    isConnected = false;
    logger.error({ err }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected; Mongoose will attempt to reconnect');
    isConnecting = false;
    logger.warn('MongoDB disconnected — will reconnect on next query');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    isConnecting = false;
    logger.info('MongoDB reconnected');
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
    isConnected = true;
    isConnecting = false;
  } catch (err) {
    isConnecting = false;
    if (disconnectRequested || retryTimer) return;
    isConnected = false;

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

/**
 * Quick connection health check.
 * Returns true if MongoDB is connected and ready.
 * Caches the result for CONNECTION_CHECK_TTL_MS to avoid hammering the connection.
 */
export function isDBConnected(): boolean {
  const now = Date.now();
  if (now - lastConnectionCheck < CONNECTION_CHECK_TTL_MS) {
    return lastConnectionState === 1;
  }
  lastConnectionCheck = now;
  lastConnectionState = mongoose.connection.readyState as 0 | 1 | 2;
  return lastConnectionState === 1;
}

/**
 * Wait for MongoDB to become connected, with a timeout.
 * Useful for critical paths that require a healthy DB.
 */
export async function waitForDB(timeoutMs = 10_000): Promise<boolean> {
  if (isDBConnected()) return true;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isDBConnected()) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return isDBConnected();
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
