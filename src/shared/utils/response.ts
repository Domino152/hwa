import type { Response } from 'express';
import type { IApiResponse } from '../types/api-response.js';
import { AppError } from './errors.js';

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
  const requestId = res.locals.requestId as string;
  const response: IApiResponse<T> = {
    success: true,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
}

export function sendError(res: Response, error: AppError | Error): void {
  const requestId = res.locals.requestId as string;
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';

  const response: IApiResponse<null> = {
    success: false,
    error: {
      code,
      message: error.message,
    },
    requestId,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
}
