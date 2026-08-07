import { Router } from 'express';
import { AIController } from './ai.controller.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { chatSchema } from './ai.schemas.js';
import type { IAIService } from './ai.types.js';

/**
 * Create AI routes with the injected AI service.
 *
 * The controller is instantiated here to keep route files self-contained
 * (consistent with WhatsApp module pattern).
 */
export function createAIRoutes(aiService: IAIService): Router {
  const controller = new AIController(aiService);
  const router = Router();

  router.post(
    '/chat',
    authenticate,
    validate(chatSchema),
    asyncHandler(controller.chat),
  );

  return router;
}

export type { IAIService } from './ai.types.js';
