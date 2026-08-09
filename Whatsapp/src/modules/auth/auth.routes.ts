import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authService } from './index.js';
import { authenticate } from './auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { loginSchema, linkWhatsAppSchema } from './auth.schemas.js';

const authController = new AuthController(authService);

const router = Router();

router.post('/login', validate(loginSchema), asyncHandler(authController.login));

router.post('/logout', authenticate, asyncHandler(authController.logout));

router.get('/me', authenticate, asyncHandler(authController.getCurrentUser));

router.post(
  '/link-whatsapp',
  authenticate,
  validate(linkWhatsAppSchema),
  asyncHandler(authController.linkWhatsApp),
);

router.get('/status', authenticate, asyncHandler(authController.getStatus));

router.get('/redeem-token', asyncHandler(authController.redeemToken));

export { authService };
export default router;
