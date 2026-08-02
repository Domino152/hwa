import { AuthService } from './auth.service.js';

export const authService = new AuthService();

export { AuthController } from './auth.controller.js';
export { authenticate, type AuthenticatedRequest } from './auth.middleware.js';
