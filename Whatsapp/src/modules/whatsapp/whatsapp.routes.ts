import { Router } from 'express';
import { WhatsAppController } from './whatsapp.controller.js';
import { WhatsAppService } from './whatsapp.service.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { sendMessageSchema } from './schemas.js';

const router = Router();
const waService = new WhatsAppService();
const controller = new WhatsAppController(waService);

router.get('/qr', controller.getQR);
router.get('/connection-status', controller.getConnectionStatus);
router.post(
  '/send-message',
  validate(sendMessageSchema),
  asyncHandler(controller.sendMessage),
);
router.post('/logout', asyncHandler(controller.logout));

export { waService };
export default router;
