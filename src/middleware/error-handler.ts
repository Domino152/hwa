import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/utils/errors.js';
import { sendError } from '../shared/utils/response.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    req.logger.warn({ err, statusCode: err.statusCode }, err.message);
    sendError(res, err);
    return;
  }

  req.logger.error({ err }, 'Unhandled error');
  sendError(res, new AppError('Internal server error', 500, 'INTERNAL_ERROR', false));
}
