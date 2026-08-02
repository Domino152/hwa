import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/utils/response.js';
import { InboxService } from './inbox.service.js';
import type { ConversationsQuery, MessagesParams, MessagesQuery } from './inbox.schemas.js';

export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  getConversations = async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = req.query as unknown as ConversationsQuery;
    const result = await this.inboxService.getConversations(page, limit);
    sendSuccess(res, result);
  };

  getMessages = async (req: Request, res: Response): Promise<void> => {
    const { phone } = req.params as unknown as MessagesParams;
    const { page, limit } = req.query as unknown as MessagesQuery;
    const result = await this.inboxService.getMessages(phone, page, limit);
    sendSuccess(res, result);
  };
}
