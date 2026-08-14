import type { WAMessage } from 'baileys';
import {
  Conversation,
  type IConversation,
  type IMessage,
  type MessageStatus,
} from '../../database/models/Conversation.js';
import { emitIncomingMessage } from '../../sockets/index.js';
import { ChatService } from './chat.service.js';
import { chatbotService, buildHelpMenu, type ChatbotResponse } from '../../chatbot/index.js';
import { integration } from '../../integration/index.js';
import {
  shouldProcessMessage,
  extractMessageContent,
  getMessageTimestamp,
  getMessageId,
} from './utils/message.js';
import logger from '../../shared/utils/logger.js';
import { config } from '../../config/index.js';

const autoReplyLogger = logger.child({ module: 'inbox' });

export interface IncomingMessagePayload {
  id: string;
  messageId: string;
  phone: string;
  jid: string;
  content: string;
  type: string;
  direction: 'incoming';
  status: 'received';
  timestamp: string;
  pushName?: string;
}

export interface ConversationListResult {
  conversations: Array<{
    id: string;
    phone: string;
    jid: string;
    contactName?: string;
    lastMessage: string;
    lastMessageAt: string;
    lastMessageDirection: 'incoming' | 'outgoing' | null;
    unreadCount: number;
  }>;
  total: number;
  page: number;
  limit: number;
}

export interface MessageListResult {
  messages: Array<{
    id: string;
    messageId: string;
    conversationId: string;
    phone: string;
    direction: 'incoming' | 'outgoing';
    type: string;
    content: string;
    status: string;
    timestamp: string;
    fromMe: boolean;
    pushName?: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

export class InboxService {
  private readonly recentlyProcessed = new Map<string, number>();
  private static readonly DEDUPE_TTL_MS = 10 * 60_000;

  constructor(private readonly chatService: ChatService) {}

  async handleIncomingMessage(msg: WAMessage): Promise<void> {
    try {
      if (!shouldProcessMessage(msg)) return;

      const identity = await this.chatService.resolveIncomingIdentity(msg);
      const jid = identity.replyJid;
      const phone = identity.identityKey;
      const { type, content } = extractMessageContent(msg);
      const timestamp = getMessageTimestamp(msg);
      const messageId = getMessageId(msg);
      const pushName = msg.pushName ?? undefined;

      if (this.isRecentlyProcessed(messageId)) {
        autoReplyLogger.info({ messageId }, 'Duplicate incoming message ignored');
        return;
      }

      const messageData: IMessage = {
        messageId,
        direction: 'incoming',
        type,
        content,
        status: 'received',
        timestamp,
        fromMe: false,
        pushName: pushName ?? null,
        requestId: null,
      };

      let conversation: IConversation | null = null;
      try {
        conversation = await this.upsertConversation({
          phone,
          jid,
          pushName,
          lastMessage: content,
          direction: 'incoming',
          timestamp,
        });
        const updatedConversation = await Conversation.addMessage(
          String(conversation._id),
          messageData,
        );
        if (!updatedConversation) {
          autoReplyLogger.info({ messageId }, 'Duplicate persisted message ignored');
          return;
        }

        const savedMessage = updatedConversation.messages[updatedConversation.messages.length - 1];
        autoReplyLogger.info(
          { phone, messageId, type, contentLength: content.length },
          'Incoming message persisted',
        );

        const payload: IncomingMessagePayload = {
          id: savedMessage?.messageId ?? messageId,
          messageId,
          phone,
          jid,
          content,
          type,
          direction: 'incoming',
          status: 'received',
          timestamp: timestamp.toISOString(),
          ...(pushName ? { pushName } : {}),
        };
        emitIncomingMessage(String(conversation._id), phone, payload, {
          phone,
          jid,
          lastMessage: content,
          lastMessageAt: timestamp.toISOString(),
          lastMessageDirection: 'incoming',
          unreadCount: updatedConversation.unreadCount,
          ...(pushName ? { contactName: pushName } : {}),
        });
      } catch (err) {
        autoReplyLogger.error(
          { err, phone, messageId },
          'Incoming message persistence failed; continuing with reply',
        );
      }

      await this.sendAutoReply(conversation, jid, phone, identity.phone !== null, content);
    } catch (err) {
      autoReplyLogger.error({ err, msgKey: msg?.key }, 'Failed to handle incoming message');
    }
  }

  private async sendAutoReply(
    conversation: IConversation | null,
    jid: string,
    phone: string,
    phoneVerified: boolean,
    userMessage: string,
  ): Promise<void> {
    try {
      const chatbotResult = await chatbotService.processMessage(userMessage, {
        phone,
        phoneVerified,
        originalText: userMessage,
      });
      const requestId = `auto-reply-${Date.now()}`;

      autoReplyLogger.info(
        { phone, intent: chatbotResult.intent, routedVia: chatbotResult.intent },
        'Chatbot reply processing',
      );

      // For greeting and help: send interactive list menu (single message, no text+buttons)
      if (
        config.WA_INTERACTIVE_MESSAGES_ENABLED &&
        (chatbotResult.intent === 'greeting' || chatbotResult.intent === 'help')
      ) {
        await this.sendInteractiveMenu(conversation, jid, phone, chatbotResult, requestId);
        return;
      }

      // For other intents: send text response + optional suggested actions
      const response = this.appendPlainTextActions(chatbotResult);
      const result = await this.chatService.sendMessage(jid, response, requestId, phone);

      autoReplyLogger.info(
        { phone, messageId: result.messageId, intent: chatbotResult.intent },
        'Chatbot reply sent',
      );

      // Send suggested quick-action buttons after the main reply
      if (
        config.WA_INTERACTIVE_MESSAGES_ENABLED &&
        chatbotResult.suggestedActions &&
        chatbotResult.suggestedActions.length > 0
      ) {
        try {
          await this.chatService.sendButtonsMessage(jid, {
            text: '_Quick Actions:_',
            footerText: 'Tap an option or type a message',
            buttons: chatbotResult.suggestedActions,
          });
        } catch (btnErr) {
          autoReplyLogger.debug(
            { err: btnErr, phone },
            'Failed to send suggested actions (non-critical)',
          );
        }
      }
    } catch (err) {
      autoReplyLogger.error(
        { err, phone },
        'Failed to send chatbot reply (incoming message still saved)',
      );
    }
  }

  private appendPlainTextActions(chatbotResult: ChatbotResponse): string {
    if (!chatbotResult.suggestedActions?.length) return chatbotResult.response;
    const actions = chatbotResult.suggestedActions
      .map((action) => action.text.replace(/^\p{Extended_Pictographic}\s*/u, '').trim())
      .filter(Boolean);
    if (actions.length === 0) return chatbotResult.response;
    return `${chatbotResult.response}\n\nYou can type: ${actions.join(', ')}`;
  }

  /**
   * Send an interactive list menu for greeting/help intents.
   * For greeting: sends text greeting first, then list menu.
   * For help: sends only the list menu.
   */
  private async sendInteractiveMenu(
    conversation: IConversation | null,
    jid: string,
    phone: string,
    chatbotResult: ChatbotResponse,
    requestId: string,
  ): Promise<void> {
    try {
      // For greeting: send the personalized text first
      if (chatbotResult.intent === 'greeting') {
        await this.chatService.sendMessage(jid, chatbotResult.response, requestId, phone);
      }

      // Send the interactive list menu
      let userData = null;
      try {
        if (!phone.startsWith('lid:')) userData = await integration.findUserByPhone(phone);
      } catch (err) {
        autoReplyLogger.warn({ err, phone }, 'User lookup failed; sending public menu');
      }
      const menu = buildHelpMenu(!!userData);

      const listResult = await this.chatService.sendListMessage(jid, menu);
      if (!listResult) throw new Error('Interactive messages are disabled or unsupported');

      autoReplyLogger.info(
        { phone, intent: chatbotResult.intent, messageId: listResult },
        'interactive_menu_sent',
      );

      // Record the list menu as an outgoing message
      if (conversation && listResult) {
        await Conversation.addMessage(String(conversation._id), {
          messageId: listResult,
          direction: 'outgoing',
          type: 'text',
          content: `[Interactive Menu: ${chatbotResult.intent}]`,
          status: 'pending',
          timestamp: new Date(),
          fromMe: true,
          pushName: null,
          requestId,
        });
      }
    } catch (err) {
      autoReplyLogger.error(
        { err, phone, intent: chatbotResult.intent },
        'Failed to send interactive menu, falling back to text',
      );

      // Fallback: send text response
      try {
        await this.chatService.sendMessage(jid, chatbotResult.response, requestId, phone);
      } catch (fallbackErr) {
        autoReplyLogger.error({ err: fallbackErr, phone }, 'Fallback text reply also failed');
      }
    }
  }

  private isRecentlyProcessed(messageId: string): boolean {
    if (messageId === 'unknown') return false;
    const now = Date.now();
    for (const [id, processedAt] of this.recentlyProcessed) {
      if (now - processedAt > InboxService.DEDUPE_TTL_MS) this.recentlyProcessed.delete(id);
    }
    if (this.recentlyProcessed.has(messageId)) return true;
    this.recentlyProcessed.set(messageId, now);
    return false;
  }

  private async upsertConversation(params: {
    phone: string;
    jid: string;
    pushName?: string;
    lastMessage: string;
    direction: 'incoming' | 'outgoing';
    timestamp: Date;
  }): Promise<IConversation> {
    await this.reconcileConversationIdentity(params.phone, params.jid);
    const update: Record<string, unknown> = {
      $set: {
        jid: params.jid,
        lastMessage: params.lastMessage,
        lastMessageAt: params.timestamp,
        lastMessageDirection: params.direction,
        ...(params.pushName ? { contactName: params.pushName } : {}),
      },
    };

    const conversation = await Conversation.findOneAndUpdate({ phone: params.phone }, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    return conversation as IConversation;
  }

  private async reconcileConversationIdentity(phone: string, jid: string): Promise<void> {
    if (!jid.endsWith('@lid') || phone.startsWith('lid:')) return;

    const [canonical, legacy] = await Promise.all([
      Conversation.findOne({ phone }),
      Conversation.findOne({ jid }),
    ]);

    if (legacy && (!canonical || String(canonical._id) === String(legacy._id))) {
      await Conversation.updateOne({ _id: legacy._id }, { $set: { phone, jid, isActive: true } });
      return;
    }

    if (canonical && legacy && String(canonical._id) !== String(legacy._id)) {
      await Conversation.updateOne({ _id: legacy._id }, { $set: { isActive: false } });
      await Conversation.updateOne({ _id: canonical._id }, { $set: { jid } });
    }
  }

  async getConversations(page: number, limit: number): Promise<ConversationListResult> {
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      Conversation.find().sort({ lastMessageAt: -1 }).skip(skip).limit(limit).lean(),
      Conversation.countDocuments(),
    ]);

    return {
      conversations: conversations.map((c) => ({
        id: String(c._id),
        phone: c.phone,
        jid: c.jid,
        ...(c.contactName ? { contactName: c.contactName } : {}),
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt.toISOString(),
        lastMessageDirection: c.lastMessageDirection,
        unreadCount: c.unreadCount,
      })),
      total,
      page,
      limit,
    };
  }

  async getMessages(phone: string, page: number, limit: number): Promise<MessageListResult> {
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findOne({ phone }).select('messages phone').lean();
    if (!conversation) {
      return { messages: [], total: 0, page, limit };
    }

    const allMessages = (conversation.messages || []).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const total = allMessages.length;
    const paginatedMessages = allMessages.slice(skip, skip + limit);

    return {
      messages: paginatedMessages.map((m) => ({
        id: m.messageId,
        messageId: m.messageId,
        conversationId: String(conversation._id),
        phone: conversation.phone,
        direction: m.direction,
        type: m.type,
        content: m.content,
        status: m.status,
        timestamp: new Date(m.timestamp).toISOString(),
        fromMe: m.fromMe,
        ...(m.pushName ? { pushName: m.pushName } : {}),
      })),
      total,
      page,
      limit,
    };
  }

  async upsertConversationForOutgoing(
    phone: string,
    jid: string,
    lastMessage: string,
    timestamp: Date,
  ): Promise<IConversation> {
    return this.upsertConversation({
      phone,
      jid,
      lastMessage,
      direction: 'outgoing',
      timestamp,
    });
  }

  async resetUnreadCount(phone: string): Promise<void> {
    await Conversation.updateOne({ phone }, { $set: { unreadCount: 0 } });
  }

  async recordOutgoingMessage(params: {
    conversationId: IConversation['_id'];
    phone: string;
    jid: string;
    messageId: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'other';
    status: 'pending' | 'sent' | 'failed';
    timestamp: Date;
    requestId?: string;
    error?: string;
  }): Promise<IMessage | null> {
    try {
      const messageData: IMessage = {
        messageId: params.messageId,
        direction: 'outgoing',
        type: params.type,
        content: params.content,
        status: params.status,
        timestamp: params.timestamp,
        fromMe: true,
        pushName: null,
        requestId: params.requestId ?? null,
      };

      const updatedConversation = await Conversation.addMessage(
        String(params.conversationId),
        messageData,
      );

      if (!updatedConversation) return null;

      return updatedConversation.messages[updatedConversation.messages.length - 1] ?? null;
    } catch (err) {
      autoReplyLogger.error(
        { err, phone: params.phone, messageId: params.messageId },
        'Failed to record outgoing message',
      );
      return null;
    }
  }

  async updateOutgoingMessageStatus(messageId: string, status: MessageStatus): Promise<void> {
    const rank: Record<MessageStatus, number> = {
      received: 0,
      pending: 1,
      sent: 2,
      delivered: 3,
      read: 4,
      failed: 0,
    };
    const conversation = await Conversation.findOne({ 'messages.messageId': messageId });
    if (!conversation) return;
    const message = conversation.messages.find((item) => item.messageId === messageId);
    if (!message || message.direction !== 'outgoing') return;
    if (message.status === 'failed') return;
    if (status === 'failed') {
      if (message.status !== 'pending' && message.status !== 'sent') return;
    } else if (rank[status] <= rank[message.status]) {
      return;
    }
    await Conversation.updateMessageStatus(String(conversation._id), messageId, status);
  }
}
