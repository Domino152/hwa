import { Router } from 'express';
import { HealthController } from './health.controller.js';
import type { ChatService } from '../whatsapp/chat.service.js';

export function createHealthRoutes(chatService?: ChatService): Router {
  const router = Router();
  const controller = new HealthController(chatService);

  router.get('/health', controller.health);
  router.get('/ready', controller.ready);
  router.get('/live', controller.live);

  return router;
}
