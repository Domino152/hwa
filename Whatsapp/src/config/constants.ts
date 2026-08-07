export const APP_NAME = 'college-whatsapp-assistant';
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const MONGOOSE_DEFAULT_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30_000,
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 60_000,
  connectTimeoutMS: 10_000,
  heartbeatFrequencyMS: 10_000,
  retryWrites: true,
  retryReads: true,
  autoIndex: false,
  autoCreate: false,
} as const;

export const SHUTDOWN_TIMEOUT_MS = 10_000;

export const PRIVATE_INTENTS = ['attendance', 'fees', 'schedule', 'results'] as const;
