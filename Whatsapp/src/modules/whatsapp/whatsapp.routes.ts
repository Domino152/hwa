import { Router } from 'express';
import { WhatsAppController } from './whatsapp.controller.js';
import { ChatService } from './chat.service.js';
import { InboxService } from './inbox.service.js';
import { InboxController } from './inbox.controller.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { sendMessageSchema } from './schemas.js';
import {
  conversationsQuerySchema,
  messagesParamsSchema,
  messagesQuerySchema,
} from './inbox.schemas.js';

const chatService = new ChatService();
const inboxService = new InboxService(chatService);
chatService.setInboxService(inboxService);

const whatsappController = new WhatsAppController(chatService);
const inboxController = new InboxController(inboxService);

const router = Router();

router.get('/qr', whatsappController.getQR);
router.get('/connection-status', whatsappController.getConnectionStatus);

router.post(
  '/send-message',
  validate(sendMessageSchema),
  asyncHandler(whatsappController.sendMessage),
);

router.post('/logout', asyncHandler(whatsappController.logout));

router.get(
  '/conversations',
  validate(conversationsQuerySchema, 'query'),
  asyncHandler(inboxController.getConversations),
);

router.get(
  '/messages/:phone',
  validate(messagesParamsSchema, 'params'),
  validate(messagesQuerySchema, 'query'),
  asyncHandler(inboxController.getMessages),
);

export { chatService, inboxService };
export default router;
