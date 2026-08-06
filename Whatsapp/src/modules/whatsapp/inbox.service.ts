import type { WAMessage } from 'baileys';
import { Conversation, type IConversation } from '../../database/models/Conversation.js';
import { Message, type IMessage } from '../../database/models/Message.js';
import { emitIncomingMessage } from '../../sockets/index.js';
import { ChatService } from './chat.service.js';
import { extractPhoneFromJid } from './utils/phone.js';
import { chatbotService } from '../../chatbot/index.js';
import {
  shouldProcessMessage,
  extractMessageContent,
  getMessageTimestamp,
  getMessageId,
} from './utils/message.js';
import logger from '../../shared/utils/logger.js';

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
    lastMessageDirection: 'incoming' | 'outgoing';
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
  constructor(private readonly chatService: ChatService) {}

  async handleIncomingMessage(msg: WAMessage): Promise<void> {
    try {
      if (!shouldProcessMessage(msg)) return;

      const jid = msg.key.remoteJid as string;
      const phone = extractPhoneFromJid(jid);
      const { type, content } = extractMessageContent(msg);
      const timestamp = getMessageTimestamp(msg);
      const messageId = getMessageId(msg);
      const pushName = msg.pushName ?? undefined;

      const conversation = await this.upsertConversation({
        phone,
        jid,
        pushName,
        lastMessage: content,
        direction: 'incoming',
        timestamp,
      });

      const savedMessage = await Message.create({
        conversationId: conversation._id,
        phone,
        jid,
        messageId,
        direction: 'incoming',
        type,
        content,
        status: 'received',
        timestamp,
        fromMe: false,
        ...(pushName ? { pushName } : {}),
      });

      autoReplyLogger.info(
        { phone, messageId, type, contentLength: content.length },
        'Incoming message persisted',
      );

      const payload: IncomingMessagePayload = {
        id: String(savedMessage._id),
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

      emitIncomingMessage(
        String(conversation._id),
        phone,
        payload,
        {
          phone,
          jid,
          lastMessage: content,
          lastMessageAt: timestamp.toISOString(),
          lastMessageDirection: 'incoming',
          unreadCount: conversation.unreadCount,
          ...(pushName ? { contactName: pushName } : {}),
        },
      );

      await this.sendAutoReply(conversation, jid, phone, content);
    } catch (err) {
      autoReplyLogger.error({ err, msgKey: msg?.key }, 'Failed to handle incoming message');
    }
  }

  private async sendAutoReply(
    conversation: IConversation,
    jid: string,
    phone: string,
    userMessage: string,
  ): Promise<void> {
    try {
      const chatbotResult = await chatbotService.processMessage(userMessage, { phone, originalText: userMessage });
      const replyText = chatbotResult.response;

      const requestId = `auto-reply-${Date.now()}`;
      const result = await this.chatService.sendMessage(jid, replyText, requestId);

      autoReplyLogger.info(
        { phone, messageId: result.messageId, intent: chatbotResult.intent },
        'Chatbot reply sent',
      );

      await Conversation.updateOne(
        { _id: conversation._id },
        {
          $set: {
            lastMessage: replyText,
            lastMessageAt: new Date(),
            lastMessageDirection: 'outgoing',
          },
        },
      );
    } catch (err) {
      autoReplyLogger.error(
        { err, phone },
        'Failed to send chatbot reply (incoming message still saved)',
      );
    }
  }

  private async upsertConversation(params: {
    phone: string;
    jid: string;
    pushName?: string;
    lastMessage: string;
    direction: 'incoming' | 'outgoing';
    timestamp: Date;
  }): Promise<IConversation> {
    const update: Record<string, unknown> = {
      $set: {
        jid: params.jid,
        lastMessage: params.lastMessage,
        lastMessageAt: params.timestamp,
        lastMessageDirection: params.direction,
        ...(params.pushName ? { contactName: params.pushName } : {}),
      },
    };

    if (params.direction === 'incoming') {
      update.$inc = { unreadCount: 1 };
    }

    const conversation = await Conversation.findOneAndUpdate(
      { phone: params.phone },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return conversation as IConversation;
  }

  async getConversations(
    page: number,
    limit: number,
  ): Promise<ConversationListResult> {
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      Conversation.find()
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
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

  async getMessages(
    phone: string,
    page: number,
    limit: number,
  ): Promise<MessageListResult> {
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findOne({ phone }).lean();
    if (!conversation) {
      return { messages: [], total: 0, page, limit };
    }

    const [messages, total] = await Promise.all([
      Message.find({ conversationId: conversation._id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversationId: conversation._id }),
    ]);

    return {
      messages: messages.map((m) => ({
        id: String(m._id),
        messageId: m.messageId,
        conversationId: String(m.conversationId),
        phone: m.phone,
        direction: m.direction,
        type: m.type,
        content: m.content,
        status: m.status,
        timestamp: m.timestamp.toISOString(),
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
    status: 'sent' | 'failed';
    timestamp: Date;
    requestId?: string;
    error?: string;
  }): Promise<IMessage | null> {
    try {
      const messageDoc = await Message.create({
        conversationId: params.conversationId,
        phone: params.phone,
        jid: params.jid,
        messageId: params.messageId,
        direction: 'outgoing',
        type: params.type,
        content: params.content,
        status: params.status,
        timestamp: params.timestamp,
        fromMe: true,
        ...(params.requestId ? { requestId: params.requestId } : {}),
      });
      return messageDoc;
    } catch (err) {
      autoReplyLogger.error(
        { err, phone: params.phone, messageId: params.messageId },
        'Failed to record outgoing message',
      );
      return null;
    }
  }
}
