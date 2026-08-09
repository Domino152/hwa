import type { Response, Request } from 'express';
import type { AuthenticatedRequest } from './auth.middleware.js';
import { AuthService } from './auth.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await this.authService.login(req.body);
    sendSuccess(res, result, 200);
  };

  logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (req.user) {
      await this.authService.unlinkWhatsApp(req.user.userId);
    }
    sendSuccess(res, { message: 'Logged out successfully' });
  };

  getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) return;
    const user = await this.authService.getCurrentUser(req.user.userId);
    sendSuccess(res, user);
  };

  linkWhatsApp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) return;
    const result = await this.authService.linkWhatsApp(req.user.userId, req.body.phone);
    sendSuccess(res, result);
  };

  getStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) return;
    const status = await this.authService.getStatus(req.user.userId);
    sendSuccess(res, status);
  };

  redeemToken = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.query as { token?: string };
    if (!token) {
      sendSuccess(res, { error: 'Token is required' }, 400);
      return;
    }
    const result = await this.authService.redeemLoginToken(token);
    if (!result) {
      sendSuccess(res, { error: 'Invalid or expired token' }, 401);
      return;
    }
    sendSuccess(res, {
      phone: result.phone,
      userId: result.userId,
      redirectTo: '/login/success',
    });
  };
}
