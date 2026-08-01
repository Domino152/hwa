import pino from 'pino';
import { config } from '../../config/index.js';

const prettyTransport = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
};

const devConfig: pino.LoggerOptions = {
  level: config.LOG_LEVEL,
  transport: prettyTransport,
};

const prodConfig: pino.LoggerOptions = {
  level: config.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ['password', 'token', 'secret', 'apiKey', 'authState'],
};

const logger = pino(config.NODE_ENV === 'production' ? prodConfig : devConfig);

export function createChildLogger(bindings: Record<string, unknown>): pino.Logger {
  return logger.child(bindings);
}

export default logger;
