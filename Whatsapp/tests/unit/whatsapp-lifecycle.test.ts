import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';

const mocks = vi.hoisted(() => ({
  sockets: [] as Array<{
    ev: EventEmitter;
    ws: { isOpen: boolean };
    user: { id: string };
    end: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
    relayMessage: ReturnType<typeof vi.fn>;
    signalRepository: { lidMapping: { getPNForLID: ReturnType<typeof vi.fn> } };
  }>,
  authRegistered: true,
}));

vi.mock('baileys', () => ({
  default: vi.fn(() => {
    const socket = {
      ev: new EventEmitter(),
      ws: { isOpen: false },
      user: { id: 'bot@s.whatsapp.net' },
      end: vi.fn(),
      logout: vi.fn(async () => undefined),
      sendMessage: vi.fn(),
      relayMessage: vi.fn(),
      signalRepository: { lidMapping: { getPNForLID: vi.fn() } },
    };
    mocks.sockets.push(socket);
    return socket;
  }),
  DisconnectReason: { loggedOut: 401, forbidden: 403, restartRequired: 515 },
  WAMessageStatus: {
    ERROR: 0,
    PENDING: 1,
    SERVER_ACK: 2,
    DELIVERY_ACK: 3,
    READ: 4,
    PLAYED: 5,
  },
  useMultiFileAuthState: vi.fn(async () => ({
    state: { creds: { registered: mocks.authRegistered }, keys: {} },
    saveCreds: vi.fn(async () => undefined),
  })),
  makeCacheableSignalKeyStore: vi.fn((keys) => keys),
  Browsers: { ubuntu: vi.fn(() => ['Ubuntu', 'Chrome', '1']) },
}));

vi.mock('qrcode-terminal', () => ({
  default: { generate: vi.fn() },
}));

import { ChatService } from '../../src/modules/whatsapp/chat.service.js';

function emitConnection(index: number, update: Record<string, unknown>): void {
  mocks.sockets[index]!.ev.emit('connection.update', update);
}

describe('WhatsApp lifecycle reliability', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.sockets.length = 0;
    mocks.authRegistered = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates only one socket for concurrent initialization and loads an existing session', async () => {
    const service = new ChatService('./test-auth', 1_000);
    await Promise.all([service.initialize(), service.initialize()]);

    expect(mocks.sockets).toHaveLength(1);
    expect(service.getStatus().qr).toBeNull();
    await service.shutdown();
  });

  it('reconnects after repeated failures without a permanent attempt budget', async () => {
    const service = new ChatService('./test-auth', 60_000);
    await service.initialize();

    for (let index = 0; index < 12; index++) {
      emitConnection(index, {
        connection: 'close',
        lastDisconnect: { error: new Error('network') },
      });
      await vi.advanceTimersByTimeAsync(30_000);
    }

    expect(mocks.sockets.length).toBeGreaterThan(10);
    expect(service.getStatus().reconnectScheduled).toBe(false);
    await service.shutdown();
  });

  it('watchdog replaces a stale open socket but does not duplicate a healthy socket', async () => {
    const service = new ChatService('./test-auth', 1_000);
    await service.initialize();
    mocks.sockets[0]!.ws.isOpen = true;
    emitConnection(0, { connection: 'open' });

    await vi.advanceTimersByTimeAsync(1_000);
    expect(mocks.sockets).toHaveLength(1);

    mocks.sockets[0]!.ws.isOpen = false;
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.sockets).toHaveLength(2);
    expect(mocks.sockets[0]!.end).toHaveBeenCalledTimes(1);
    await service.shutdown();
  });

  it('does not create overlapping reconnects and stops timers during shutdown', async () => {
    const service = new ChatService('./test-auth', 1_000);
    await service.initialize();
    emitConnection(0, { connection: 'close', lastDisconnect: { error: new Error('network') } });

    await vi.advanceTimersByTimeAsync(1_000);
    expect(mocks.sockets).toHaveLength(2);
    await service.shutdown();
    expect(service.getStatus().watchdogRunning).toBe(false);

    await vi.advanceTimersByTimeAsync(120_000);
    expect(mocks.sockets).toHaveLength(2);
  });

  it('pauses automatic reconnect after WhatsApp invalidates the session', async () => {
    const service = new ChatService('./test-auth', 1_000);
    await service.initialize();
    emitConnection(0, {
      connection: 'close',
      lastDisconnect: { error: { output: { statusCode: 401 } } },
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.sockets).toHaveLength(2);
    emitConnection(1, {
      connection: 'close',
      lastDisconnect: { error: { output: { statusCode: 401 } } },
    });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(mocks.sockets).toHaveLength(2);
    expect(service.getStatus().sessionInvalid).toBe(true);
    expect(service.getStatus().reconnectScheduled).toBe(false);
    await service.shutdown();
  });

  it('exposes a QR only when Baileys requests one', async () => {
    mocks.authRegistered = false;
    const service = new ChatService('./test-auth', 1_000);
    await service.initialize();
    expect(service.getQR()).toBeNull();

    emitConnection(0, { qr: 'new-session-qr' });
    expect(service.getQR()).toBe('new-session-qr');
    await service.shutdown();
  });

  it('tracks server, delivery, and read acknowledgements', async () => {
    const updateOutgoingMessageStatus = vi.fn(async () => undefined);
    const service = new ChatService('./test-auth', 1_000);
    service.setInboxService({ updateOutgoingMessageStatus } as never);
    await service.initialize();

    mocks.sockets[0]!.ev.emit('messages.update', [
      { key: { id: 'out-1' }, update: { status: 2 } },
      { key: { id: 'out-2' }, update: { status: 3 } },
    ]);
    mocks.sockets[0]!.ev.emit('message-receipt.update', [
      { key: { id: 'out-3' }, receipt: { readTimestamp: 123 } },
    ]);
    await Promise.resolve();

    expect(updateOutgoingMessageStatus).toHaveBeenCalledWith('out-1', 'sent');
    expect(updateOutgoingMessageStatus).toHaveBeenCalledWith('out-2', 'delivered');
    expect(updateOutgoingMessageStatus).toHaveBeenCalledWith('out-3', 'read');
    await service.shutdown();
  });

  it('persists pending before applying an acknowledgement observed during send', async () => {
    const updateOutgoingMessageStatus = vi.fn(async () => undefined);
    const recordOutgoingMessage = vi.fn(async (message) => message);
    const service = new ChatService('./test-auth', 1_000);
    service.setInboxService({
      updateOutgoingMessageStatus,
      upsertConversationForOutgoing: vi.fn(async () => ({ _id: 'conversation-1' })),
      recordOutgoingMessage,
    } as never);
    await service.initialize();
    mocks.sockets[0]!.ws.isOpen = true;
    emitConnection(0, { connection: 'open' });
    mocks.sockets[0]!.sendMessage.mockImplementation(async () => {
      mocks.sockets[0]!.ev.emit('messages.update', [
        { key: { id: 'out-race' }, update: { status: 2 } },
      ]);
      return { key: { id: 'out-race' } };
    });

    await service.sendMessage('15551234567@lid', 'hello', 'request-1', '919999999999');

    expect(mocks.sockets[0]!.sendMessage).toHaveBeenCalledWith('15551234567@lid', {
      text: 'hello',
      linkPreview: null,
    });
    expect(recordOutgoingMessage).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'out-race', status: 'pending' }),
    );
    expect(updateOutgoingMessageStatus).toHaveBeenLastCalledWith('out-race', 'sent');
    await service.shutdown();
  });
});
