import type { Request, Response, NextFunction } from 'express';
import { generateRequestId } from '../shared/utils/uuid.js';
import { createChildLogger } from '../shared/utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = generateRequestId();
  req.requestId = requestId;
  res.locals.requestId = requestId;

  req.logger = createChildLogger({ requestId, method: req.method, url: req.url });

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    req.logger.info(
      { statusCode: res.statusCode, durationMs: duration },
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
    );
  });

  next();
}
