import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../shared/utils/errors.js';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = result.error.flatten().fieldErrors;
      next(new ValidationError(`Validation failed on ${part}`, details));
      return;
    }
    req[part] = result.data;
    next();
  };
}
