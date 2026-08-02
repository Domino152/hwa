import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';

export interface TokenPayload {
  userId: string;
  username: string;
  role: 'student' | 'parent';
}

export function signToken(payload: TokenPayload): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = { expiresIn: config.JWT_EXPIRES_IN };
  return jwt.sign(payload as object, config.JWT_SECRET, options);
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload & TokenPayload;
  return {
    userId: decoded.userId,
    username: decoded.username,
    role: decoded.role,
  };
}
