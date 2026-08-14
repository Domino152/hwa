import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WAMessage } from 'baileys';

const mocks = vi.hoisted(() => ({
  addMessage: vi.fn(),
  findOneAndUpdate: vi.fn(),
  processMessage: vi.fn(),
}));

vi.mock('../../src/database/models/Conversation.js', () => ({
  Conversation: {
    addMessage: mocks.addMessage,
    findOneAndUpdate: mocks.findOneAndUpdate,
  },
}));

vi.mock('../../src/chatbot/index.js', () => ({
  chatbotService: { processMessage: mocks.processMessage },
  buildHelpMenu: vi.fn(() => ({
    title: 'Menu',
    description: 'Choose',
    buttonText: 'Open',
    sections: [],
  })),
}));

vi.mock('../../src/integration/index.js', () => ({
  integration: { findUserByPhone: vi.fn(async () => null) },
}));

vi.mock('../../src/sockets/index.js', () => ({
  emitIncomingMessage: vi.fn(),
}));

import { InboxService } from '../../src/modules/whatsapp/inbox.service.js';
import type { ChatService } from '../../src/modules/whatsapp/chat.service.js';

function incoming(id: string, text = 'fees'): WAMessage {
  return {
    key: { id, remoteJid: '919999999999@s.whatsapp.net', fromMe: false },
    message: { conversation: text },
    messageTimestamp: 1_700_000_000,
  } as unknown as WAMessage;
}

describe('Inbox reliability', () => {
  const sendMessage = vi.fn();
  const sendButtonsMessage = vi.fn();
  const sendListMessage = vi.fn();
  const resolveIncomingIdentity = vi.fn();
  const chatService = {
    sendMessage,
    sendButtonsMessage,
    sendListMessage,
    resolveIncomingIdentity,
  } as unknown as ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findOneAndUpdate.mockResolvedValue({
      _id: 'conversation-id',
      unreadCount: 0,
      messages: [],
    });
    mocks.addMessage.mockResolvedValue({
      _id: 'conversation-id',
      unreadCount: 1,
      messages: [{ messageId: 'message-id' }],
    });
    mocks.processMessage.mockResolvedValue({
      intent: 'fees',
      response: 'Fee response',
      suggestedActions: [],
    });
    sendMessage.mockResolvedValue({ messageId: 'reply-id' });
    resolveIncomingIdentity.mockImplementation(async (message: WAMessage) => ({
      replyJid: message.key.remoteJid,
      phone: '919999999999',
      identityKey: '919999999999',
      pnJid: message.key.remoteJid,
      lidJid: null,
    }));
  });

  it('responds to a normal incoming message', async () => {
    const service = new InboxService(chatService);
    await service.handleIncomingMessage(incoming('normal-1'));
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('renders greeting actions as typeable plain text by default', async () => {
    mocks.processMessage.mockResolvedValueOnce({
      intent: 'greeting',
      response: 'Welcome',
      suggestedActions: [{ id: 'intent:help', text: 'Help' }],
    });
    const service = new InboxService(chatService);

    await service.handleIncomingMessage(incoming('plain-menu-1', 'hi'));

    expect(sendListMessage).not.toHaveBeenCalled();
    expect(sendButtonsMessage).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(
      '919999999999@s.whatsapp.net',
      'Welcome\n\nYou can type: Help',
      expect.stringMatching(/^auto-reply-/),
      '919999999999',
    );
  });

  it('continues replying when MongoDB persistence fails', async () => {
    mocks.findOneAndUpdate.mockRejectedValueOnce(new Error('Mongo unavailable'));
    const service = new InboxService(chatService);
    await service.handleIncomingMessage(incoming('mongo-failure-1'));
    expect(sendMessage).toHaveBeenCalledWith(
      '919999999999@s.whatsapp.net',
      'Fee response',
      expect.stringMatching(/^auto-reply-/),
      '919999999999',
    );
  });

  it('uses the verified PN identity while replying to an LID address', async () => {
    resolveIncomingIdentity.mockResolvedValueOnce({
      replyJid: '155212148928716@lid',
      phone: '919999999999',
      identityKey: '919999999999',
      pnJid: '919999999999@s.whatsapp.net',
      lidJid: '155212148928716@lid',
    });
    const service = new InboxService(chatService);
    await service.handleIncomingMessage(incoming('lid-1'));
    expect(mocks.processMessage).toHaveBeenCalledWith(
      'fees',
      expect.objectContaining({ phone: '919999999999', phoneVerified: true }),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      '155212148928716@lid',
      'Fee response',
      expect.stringMatching(/^auto-reply-/),
      '919999999999',
    );
  });

  it('processes the same WhatsApp message only once', async () => {
    const service = new InboxService(chatService);
    const message = incoming('duplicate-1');
    await Promise.all([
      service.handleIncomingMessage(message),
      service.handleIncomingMessage(message),
    ]);
    expect(mocks.processMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('contains a bad message and continues processing later messages', async () => {
    const service = new InboxService(chatService);
    await service.handleIncomingMessage({ key: {} } as WAMessage);
    await service.handleIncomingMessage(incoming('good-after-bad'));
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});
