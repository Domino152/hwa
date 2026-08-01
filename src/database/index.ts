import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { MONGOOSE_DEFAULT_OPTIONS } from '../config/constants.js';
import logger from '../shared/utils/logger.js';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) {
    logger.info('MongoDB already connected');
    return;
  }

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    isConnected = true;
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
    logger.fatal({ err }, 'Failed to connect to MongoDB');
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  logger.info('MongoDB disconnected gracefully');
}

export function isDBConnected(): boolean {
  return isConnected;
}
