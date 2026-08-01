export const APP_NAME = 'college-whatsapp-assistant';
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const MONGOOSE_DEFAULT_OPTIONS = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 45_000,
} as const;

export const SHUTDOWN_TIMEOUT_MS = 10_000;
