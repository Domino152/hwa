import { Router } from 'express';
import { HealthController } from './health.controller.js';
import type { WhatsAppService } from '../whatsapp/whatsapp.service.js';

export function createHealthRoutes(waService?: WhatsAppService): Router {
  const router = Router();
  const controller = new HealthController(waService);

  router.get('/health', controller.health);
  router.get('/ready', controller.ready);
  router.get('/live', controller.live);

  return router;
}
