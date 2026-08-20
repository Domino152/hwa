export const APP_NAME = 'college-whatsapp-assistant';
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const MONGOOSE_DEFAULT_OPTIONS: Record<string, unknown> = {
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 60_000,
  serverSelectionTimeoutMS: 15_000,
  socketTimeoutMS: 60_000,
  connectTimeoutMS: 15_000,
  heartbeatFrequencyMS: 10_000,
  retryWrites: true,
  retryReads: true,
  autoIndex: false,
  autoCreate: false,
  compressors: ['zlib'],
  zlibCompressionLevel: 6,
  appName: 'college-whatsapp-assistant',
};

export const SHUTDOWN_TIMEOUT_MS = 10_000;

export const PRIVATE_INTENTS = ['attendance', 'fees', 'schedule', 'results'] as const;
