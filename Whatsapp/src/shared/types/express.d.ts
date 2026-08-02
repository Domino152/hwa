import type pino from 'pino';
import type { TokenPayload } from '../../modules/auth/token.service.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      logger: pino.Logger;
      user?: TokenPayload;
    }
  }
}
