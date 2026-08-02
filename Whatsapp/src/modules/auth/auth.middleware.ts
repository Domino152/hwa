import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type TokenPayload } from './token.service.js';
import { UnauthorizedError } from '../../shared/utils/errors.js';
import { User } from '../../database/models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Express middleware that verifies the JWT from the Authorization header.
 * Attaches the decoded token payload to req.user.
 * Returns 401 Unauthorized for missing/invalid/expired tokens.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Missing token');
    }

    const payload: TokenPayload = verifyToken(token);

    const user = await User.findById(payload.userId).select('isActive');
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account is inactive or not found');
    }

    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err);
      return;
    }

    if (err instanceof Error && err.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token has expired'));
      return;
    }

    if (err instanceof Error && err.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid token'));
      return;
    }

    next(new UnauthorizedError('Authentication failed'));
  }
}
