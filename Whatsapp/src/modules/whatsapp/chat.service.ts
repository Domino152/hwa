import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  Browsers,
  WAMessageStatus,
  type WAMessage,
  type WAMessageContent,
  type WAMessageKey,
  type WASocket,
} from 'baileys';
import type pino from 'pino';
import { Boom } from '@hapi/boom';
import NodeCache from '@cacheable/node-cache';
import { rm } from 'node:fs/promises';
import { config } from '../../config/index.js';
import { emitToAll } from '../../sockets/index.js';
import logger from '../../shared/utils/logger.js';
import { ServiceUnavailableError } from '../../shared/utils/errors.js';
import { extractPhoneFromJid } from './utils/phone.js';
import { resolveInboundIdentity, type InboundIdentity } from './utils/identity.js';
import { useMongoAuthState } from './mongo-auth-state.js';
import { InboxService } from './inbox.service.js';
import type { WhatsAppServiceStatus } from '../../shared/types/whatsapp.js';
import qrCodeTerminal from 'qrcode-terminal';
import {
  sendListMessage as sendInteractiveList,
  sendButtonsMessage as sendInteractiveButtons,
  type ButtonOption,
  type ListSection,
} from '../../chatbot/interactive.js';

type ConnectionStateStr = 'connecting' | 'open' | 'close';
type OutgoingDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

const QR_TIMEOUT_MS = 60_000;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const CONNECTING_STALE_MIN_MS = 60_000;
const FALLBACK_TTL_MS = 5 * 60 * 1000;
const FALLBACK_CLEANUP_INTERVAL_MS = 60_000;

/**
 * Metadata stored when sending an interactive message so we can send a
 * plain-text fallback if WhatsApp later rejects it (commonly error 479
 * for LID-format recipients on linked devices).
 */
interface InteractiveFallback {
  jid: string;
  fallbackText: string;
  requestId: string;
  expiresAt: number;
}

export class ChatService {
  private sock: WASocket | null = null;
  private state: ConnectionStateStr = 'close';
  private qr: string | null = null;
  private connectedAt: string | null = null;
  private reconnectAttempts = 0;
  private userJid: string | null = null;
  private readonly logger: pino.Logger;
  private readonly baileysLogger: pino.Logger;
  private readonly sessionDir: string;
  private readonly watchdogIntervalMs: number;
  private readonly msgRetryCounterCache = new NodeCache();
  private inbox: InboxService | null = null;
  private initializingPromise: Promise<void> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private qrExpiryTimer: ReturnType<typeof setTimeout> | null = null;
  private shutdownRequested = false;
  private sessionInvalid = false;
  private invalidSessionQrAttempted = false;
  private connectingSince = 0;
  private watchdogHealthyLogged = false;
  private readonly lidToPn = new Map<string, string>();
  private readonly deliveryUpdates = new Map<string, OutgoingDeliveryStatus>();
  private clearAuthState: (() => Promise<void>) | null = null;

  /**
   * Tracker for interactive messages (lists/buttons) that may need a text
   * fallback if WhatsApp later returns an ack error (e.g. 479 for LID JIDs).
   * Keyed by outgoing messageId. Entries auto-expire after FALLBACK_TTL_MS.
   */
  private readonly interactiveFallbacks = new Map<string, InteractiveFallback>();

  constructor(sessionDir?: string, watchdogIntervalMs?: number) {
    this.sessionDir = sessionDir ?? config.WA_SESSION_DIR;
    this.watchdogIntervalMs = watchdogIntervalMs ?? config.WA_WATCHDOG_INTERVAL_MS;
    this.logger = logger.child({ module: 'whatsapp' });
    this.baileysLogger = logger.child({ module: 'whatsapp-baileys' }, { level: 'warn' });
  }

  setInboxService(inbox: InboxService): void {
    this.inbox = inbox;
  }

  async initialize(): Promise<void> {
    this.shutdownRequested = false;
    this.startWatchdog();

    if (this.state === 'open' && this.sock?.ws.isOpen) return;
    if (this.initializingPromise) {
      this.logger.debug('WhatsApp reconnect deferred because already connecting');
      return this.initializingPromise;
    }

    this.initializingPromise = this.createSocket();
    let failure: unknown;
    try {
      await this.initializingPromise;
    } catch (err) {
      failure = err;
      this.state = 'close';
      this.logger.error({ err }, 'WhatsApp reconnect failed');
    } finally {
      this.initializingPromise = null;
    }

    this.reconnectAttempts = 0;
    this.interactiveFallbacks.clear();

    if (failure) {
      this.scheduleReconnect();
      throw failure instanceof Error ? failure : new Error(String(failure));
    }
  }

  private async createSocket(): Promise<void> {
    this.clearReconnectTimer();
    this.state = 'connecting';
    this.connectingSince = Date.now();
    this.watchdogHealthyLogged = false;
    this.logger.info({ attempt: this.reconnectAttempts + 1 }, 'WhatsApp reconnect started');

    const oldSocket = this.sock;
    this.sock = null;
    if (oldSocket) {
      try {
        oldSocket.end(undefined);
      } catch {
        /* already closed */
      }
    }

    let state: Awaited<ReturnType<typeof useMultiFileAuthState>>['state'];
    let saveCreds: () => Promise<void>;
    if (config.WA_AUTH_STORE === 'mongodb') {
      const mongoAuth = await useMongoAuthState(
        config.WA_SESSION_ID,
        config.WA_AUTH_ENCRYPTION_KEY!,
      );
      ({ state, saveCreds } = mongoAuth);
      this.clearAuthState = mongoAuth.clear;
    } else {
      const filesystemAuth = await useMultiFileAuthState(this.sessionDir);
      ({ state, saveCreds } = filesystemAuth);
      this.clearAuthState = () => rm(this.sessionDir, { recursive: true, force: true });
    }
    this.logger.info({ registered: state.creds.registered }, 'WhatsApp session loaded');

    const socket = makeWASocket({
      logger: this.baileysLogger as any,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.logger as any),
      },
      browser: Browsers.ubuntu('Chrome'),
      msgRetryCounterCache: this.msgRetryCounterCache as any,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      fireInitQueries: false,
      shouldSyncHistoryMessage: () => false,
      getMessage: (_key: WAMessageKey): Promise<WAMessageContent | undefined> =>
        Promise.resolve(undefined),
    });

    this.sock = socket;
    this.setupEventHandlers(socket, saveCreds);
    this.logger.info('WhatsApp service initialized');
  }

  private setupEventHandlers(socket: WASocket, saveCreds: () => Promise<void>): void {
    socket.ev.on('connection.update', (update) => {
      if (this.sock !== socket) return;
      try {
        this.handleConnectionUpdate(update);
      } catch (err) {
        this.logger.error({ err }, 'Failed to handle WhatsApp connection update');
      }
    });

    socket.ev.on('creds.update', () => {
      if (this.sock !== socket) return;
      void saveCreds()
        .then(() => this.logger.debug('Credentials saved'))
        .catch((err) => this.logger.error({ err }, 'Failed to save WhatsApp credentials'));
    });

    socket.ev.on('messages.upsert', (upsert) => {
      if (this.sock !== socket || upsert.type !== 'notify' || !this.inbox) return;
      for (const msg of upsert.messages) {
        void this.inbox.handleIncomingMessage(msg).catch((err) => {
          this.logger.error({ err, msgKey: msg.key }, 'Incoming message processing failed');
        });
      }
    });

    socket.ev.on('lid-mapping.update', ({ lid, pn }) => {
      if (this.sock !== socket) return;
      this.lidToPn.set(lid, pn);
      this.logger.debug({ lid }, 'LID mapping cached');
    });

    socket.ev.on('messages.update', (updates) => {
      if (this.sock !== socket || !this.inbox) return;
      for (const { key, update } of updates) {
        if (!key.id || update.status === undefined || update.status === null) continue;
        const status = this.mapMessageStatus(update.status);
        if (status) this.trackDeliveryUpdate(key.id, status);
      }
    });

    socket.ev.on('message-receipt.update', (updates) => {
      if (this.sock !== socket || !this.inbox) return;
      for (const { key, receipt } of updates) {
        if (!key.id) continue;
        const status = receipt.readTimestamp || receipt.playedTimestamp ? 'read' : 'delivered';
        this.trackDeliveryUpdate(key.id, status);
      }
    });

    this.sock.ev.on('messages.update', (updates) => {
      void this.handleMessageUpdates(updates);
    });

    this.startFallbackCleanup();
  }

  private mapMessageStatus(status: number): OutgoingDeliveryStatus | null {
    switch (status) {
      case WAMessageStatus.ERROR:
        return 'failed';
      case WAMessageStatus.PENDING:
        return 'pending';
      case WAMessageStatus.SERVER_ACK:
        return 'sent';
      case WAMessageStatus.DELIVERY_ACK:
        return 'delivered';
      case WAMessageStatus.READ:
      case WAMessageStatus.PLAYED:
        return 'read';
      default:
        return null;
    }
  }

  private trackDeliveryUpdate(messageId: string, status: OutgoingDeliveryStatus): void {
    this.deliveryUpdates.set(messageId, status);
    if (this.deliveryUpdates.size > 1_000) {
      const oldest = this.deliveryUpdates.keys().next().value;
      if (oldest) this.deliveryUpdates.delete(oldest);
    }
    void this.inbox?.updateOutgoingMessageStatus(messageId, status);
  }

  private handleConnectionUpdate(update: {
    connection?: string;
    lastDisconnect?: { error?: Boom | Error };
    qr?: string;
  }): void {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.qr = qr;
      this.state = 'connecting';
      this.sessionInvalid = false;
      this.invalidSessionQrAttempted = false;
      this.logger.info('WhatsApp requires QR');
      emitToAll('qr', { qr, timeout: QR_TIMEOUT_MS });
      qrCodeTerminal.generate(qr, { small: true }, (code: string) => console.log(code));

      if (this.qrExpiryTimer) clearTimeout(this.qrExpiryTimer);
      this.qrExpiryTimer = setTimeout(() => {
        if (this.qr === qr) {
          this.qr = null;
          this.logger.warn('QR code expired; waiting for a new one');
        }
      }, QR_TIMEOUT_MS);
      this.qrExpiryTimer.unref?.();
    }

    if (connection === 'close') {
      const error = lastDisconnect?.error;
      const statusCode =
        error && 'output' in error ? (error as Boom).output?.statusCode : undefined;

      this.logger.warn({ statusCode }, 'Connection closed');
      this.state = 'close';
      this.connectedAt = null;
      this.userJid = null;
      if (this.sock) {
        try {
          this.sock.end(undefined);
        } catch {
          /* already closed */
        }
        this.sock = null;
      }

      if (this.shutdownRequested) return;

      if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.forbidden) {
        this.sessionInvalid = true;
        this.qr = null;
        this.clearReconnectTimer();
        this.logger.error({ statusCode }, 'WhatsApp session invalid');
        this.logger.warn('WhatsApp requires QR; automatic reconnect paused');
        emitToAll('connection-status', {
          state: 'close',
          timestamp: new Date().toISOString(),
        });
        if (statusCode === DisconnectReason.loggedOut && !this.invalidSessionQrAttempted) {
          this.invalidSessionQrAttempted = true;
          void this.initialize().catch((err) => {
            this.logger.error({ err }, 'Unable to create QR socket for invalid session');
          });
        }
        return;
      }

      if (statusCode === DisconnectReason.restartRequired) {
        this.qr = null;
        this.logger.info('restartRequired received; reconnecting with saved credentials');
        this.scheduleReconnect(0);
        return;
      }

      this.scheduleReconnect();
    }

    if (connection === 'open') {
      this.state = 'open';
      this.qr = null;
      this.connectedAt = new Date().toISOString();
      this.reconnectAttempts = 0;
      this.sessionInvalid = false;
      this.invalidSessionQrAttempted = false;
      this.userJid = this.sock?.user?.id ?? null;
      this.logger.info({ userJid: this.userJid }, 'WhatsApp reconnect successful');
      emitToAll('connection-status', {
        state: 'open',
        timestamp: this.connectedAt,
      });
    }
  }

  private scheduleReconnect(delayOverride?: number): void {
    if (this.shutdownRequested || this.sessionInvalid || this.state === 'open') return;
    if (this.initializingPromise || this.reconnectTimer) {
      this.logger.debug('WhatsApp reconnect deferred because already connecting');
      return;
    }

    this.reconnectAttempts++;
    const exponent = Math.min(this.reconnectAttempts - 1, 10);
    const delay =
      delayOverride ??
      Math.min(RECONNECT_BASE_DELAY_MS * Math.pow(2, exponent), RECONNECT_MAX_DELAY_MS);
    this.logger.info(
      { attempt: this.reconnectAttempts, delayMs: delay },
      'WhatsApp reconnect scheduled',
    );
    emitToAll('connection-status', {
      state: 'connecting',
      timestamp: new Date().toISOString(),
    });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.initialize().catch(() => {
        // initialize logs the failure and schedules another capped-backoff retry.
      });
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private startWatchdog(): void {
    if (this.watchdogTimer) return;
    this.watchdogTimer = setInterval(() => this.runWatchdog(), this.watchdogIntervalMs);
    this.watchdogTimer.unref?.();
    this.logger.info({ intervalMs: this.watchdogIntervalMs }, 'WhatsApp watchdog started');
  }

  private runWatchdog(): void {
    if (this.shutdownRequested || this.sessionInvalid) return;

    if (this.state === 'open' && this.sock?.ws.isOpen) {
      if (!this.watchdogHealthyLogged) {
        this.logger.info('WhatsApp watchdog healthy');
        this.watchdogHealthyLogged = true;
      }
      return;
    }

    if (this.initializingPromise || this.reconnectTimer) return;
    if (this.state === 'connecting' && this.qr) return;

    const connectingTooLong =
      this.state === 'connecting' &&
      Date.now() - this.connectingSince >=
        Math.max(CONNECTING_STALE_MIN_MS, this.watchdogIntervalMs * 2);
    const stale =
      this.state === 'close' ||
      (this.state === 'open' && !this.sock?.ws.isOpen) ||
      connectingTooLong;
    if (!stale) return;

    this.watchdogHealthyLogged = false;
    this.logger.warn(
      { state: this.state, socketOpen: this.sock?.ws.isOpen ?? false },
      'WhatsApp watchdog detected stale connection',
    );
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch {
        /* already closed */
      }
      this.sock = null;
    }
    this.state = 'close';
    this.scheduleReconnect(0);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  async sendMessage(
    jid: string,
    text: string,
    requestId: string,
    identityKey: string = extractPhoneFromJid(jid),
  ): Promise<{ messageId: string }> {
    if (!this.sock || this.state !== 'open') {
      throw new ServiceUnavailableError('WhatsApp not connected');
    }

    const phone = identityKey;
    const timestamp = new Date();

    try {
      const result = await this.sock.sendMessage(jid, { text, linkPreview: null });
      const messageId = result?.key?.id ?? 'unknown';
      this.logger.info({ jid, messageId, requestId }, 'Message queued for WhatsApp');
      await this.persistOutgoingMessage({ phone, jid, text, timestamp, messageId, requestId });
      return { messageId };
    } catch (err) {
      this.logger.error({ jid, requestId, err }, 'Failed to send message');

      if (this.inbox) {
        try {
          const conversation = await Conversation.findOne({ phone });
          if (conversation) {
            await this.inbox.recordOutgoingMessage({
              conversationId: conversation._id,
              phone,
              jid,
              messageId: 'unknown',
              content: text,
              type: 'text',
              status: 'failed',
              timestamp,
              requestId,
              error: errorMsg,
            });
          }
        } catch (persistErr) {
          this.logger.error({ err: persistErr }, 'Failed to persist failed-message record');
        }
      }
      throw err;
    }
  }

  private async persistOutgoingMessage(params: {
    phone: string;
    jid: string;
    text: string;
    timestamp: Date;
    messageId: string;
    requestId: string;
  }): Promise<void> {
    if (!this.inbox) return;
    try {
      const conversation = await this.inbox.upsertConversationForOutgoing(
        params.phone,
        params.jid,
        params.text,
        params.timestamp,
      );
      const persisted = await this.inbox.recordOutgoingMessage({
        conversationId: conversation._id,
        phone: params.phone,
        jid: params.jid,
        messageId: params.messageId,
        content: params.text,
        type: 'text',
        status: 'pending',
        timestamp: params.timestamp,
        requestId: params.requestId,
      });
      const observedStatus = this.deliveryUpdates.get(params.messageId);
      if (persisted && observedStatus) {
        await this.inbox.updateOutgoingMessageStatus(params.messageId, observedStatus);
        if (observedStatus === 'read' || observedStatus === 'failed') {
          this.deliveryUpdates.delete(params.messageId);
        }
      }
    } catch (err) {
      this.logger.error(
        { err, messageId: params.messageId },
        'Message sent but persistence failed',
      );
    }
  }

  onIncomingMessage(msg: WAMessage): void {
    if (!this.inbox) return;
    void this.inbox.handleIncomingMessage(msg).catch((err) => {
      this.logger.error({ err, msgKey: msg.key }, 'Incoming message processing failed');
    });
  }

  async resolveIncomingIdentity(msg: WAMessage): Promise<InboundIdentity> {
    return resolveInboundIdentity(msg, async (lid) => {
      const cached = this.lidToPn.get(lid);
      if (cached) return cached;
      const mapped = await this.sock?.signalRepository.lidMapping.getPNForLID(lid);
      if (mapped) this.lidToPn.set(lid, mapped);
      return mapped ?? null;
    });
  }

  /**
   * Register a fallback text for an interactive message so we can recover
   * if WhatsApp asynchronously rejects the message with error 479.
   */
  registerInteractiveFallback(
    messageId: string,
    jid: string,
    fallbackText: string,
    requestId: string,
  ): void {
    this.interactiveFallbacks.set(messageId, {
      jid,
      fallbackText,
      requestId,
      expiresAt: Date.now() + FALLBACK_TTL_MS,
    });
  }

  /**
   * Handle `messages.update` events from Baileys.
   * Detects async error acks (e.g. 479) on previously-sent interactive messages
   * and sends the registered plain-text fallback automatically.
   */
  private async handleMessageUpdates(
    updates: Array<{
      key?: WAMessageKey;
      update?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    for (const update of updates) {
      const messageId = update.key?.id;
      if (!messageId) continue;

      const fallback = this.interactiveFallbacks.get(messageId);
      if (!fallback) continue;

      const errorCode = this.extractErrorCode(update.update);
      if (errorCode === undefined) continue;

      if (errorCode === 479) {
        this.logger.warn(
          { jid: fallback.jid, messageId, requestId: fallback.requestId },
          'Interactive message rejected with error 479 — sending text fallback',
        );
        this.interactiveFallbacks.delete(messageId);
        try {
          await this.sendMessage(fallback.jid, fallback.fallbackText, `${fallback.requestId}-fallback`);
        } catch (err) {
          this.logger.error(
            { err, jid: fallback.jid, messageId },
            'Failed to send text fallback after error 479',
          );
        }
      }
    }
  }

  private extractErrorCode(update: Record<string, unknown> | undefined): number | undefined {
    if (!update) return undefined;

    const candidates: unknown[] = [
      update.error,
      update.messageStubType,
      update.status,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'number') return candidate;
      if (typeof candidate === 'string') {
        const parsed = Number(candidate);
        if (!Number.isNaN(parsed)) return parsed;
      }
      if (candidate && typeof candidate === 'object') {
        const obj = candidate as Record<string, unknown>;
        if (typeof obj.code === 'number') return obj.code;
        if (typeof obj.code === 'string') {
          const parsed = Number(obj.code);
          if (!Number.isNaN(parsed)) return parsed;
        }
      }
    }
    return undefined;
  }

  private fallbackCleanupTimer: NodeJS.Timeout | null = null;

  private startFallbackCleanup(): void {
    if (this.fallbackCleanupTimer) return;
    this.fallbackCleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, entry] of this.interactiveFallbacks) {
        if (entry.expiresAt < now) {
          this.interactiveFallbacks.delete(id);
        }
      }
    }, FALLBACK_CLEANUP_INTERVAL_MS);
    this.fallbackCleanupTimer.unref();
  }

  private stopFallbackCleanup(): void {
    if (this.fallbackCleanupTimer) {
      clearInterval(this.fallbackCleanupTimer);
      this.fallbackCleanupTimer = null;
    }
  }
  }

  async logout(): Promise<void> {
    this.shutdownRequested = true;
    const socket = this.sock;
    try {
      await socket?.logout();
    } finally {
      this.shutdown();
      await this.clearAuthState?.();
      this.clearAuthState = null;
      this.lidToPn.clear();
      this.deliveryUpdates.clear();
      this.logger.info('WhatsApp authentication state cleared');
    }
  }

  shutdown(): void {
    this.shutdownRequested = true;
    this.clearReconnectTimer();
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.qrExpiryTimer) {
      clearTimeout(this.qrExpiryTimer);
      this.qrExpiryTimer = null;
    }
    if (this.sock) {
      this.sock.end(undefined);
      this.sock = null;
    }
    this.state = 'close';
    this.qr = null;
    this.connectedAt = null;
    this.userJid = null;
    this.reconnectAttempts = 0;
    this.logger.info('WhatsApp service stopped; authentication state preserved');
    this.interactiveFallbacks.clear();
    this.stopFallbackCleanup();
    emitToAll('connection-status', {
      state: 'close',
      timestamp: new Date().toISOString(),
    });
  }

  getStatus(): WhatsAppServiceStatus {
    return {
      state: this.state,
      qr: this.qr,
      connectedAt: this.connectedAt,
      reconnectAttempts: this.reconnectAttempts,
      userJid: this.userJid,
      initializing: this.initializingPromise !== null,
      reconnectScheduled: this.reconnectTimer !== null,
      watchdogRunning: this.watchdogTimer !== null,
      sessionInvalid: this.sessionInvalid,
    };
  }

  isConnected(): boolean {
    return this.state === 'open';
  }

  getQR(): string | null {
    return this.qr;
  }

  /**
   * Send a list message (dropdown menu) to a user.
   * Falls back to plain text if unsupported.
   * Registers a text fallback so that async error 479 acks can be recovered.
   */
  async sendListMessage(
    jid: string,
    params: {
      title: string;
      description: string;
      buttonText: string;
      footerText?: string;
      sections: ListSection[];
    },
    fallbackText?: string,
    requestId?: string,
  ): Promise<string | null> {
    if (!config.WA_INTERACTIVE_MESSAGES_ENABLED) return null;
    if (!this.sock || this.state !== 'open') {
      throw new ServiceUnavailableError('WhatsApp not connected');
    }

    const messageId = await sendInteractiveList(this.sock, jid, params);

    if (messageId && fallbackText) {
      this.registerInteractiveFallback(
        messageId,
        jid,
        fallbackText,
        requestId ?? `list-${Date.now()}`,
      );
    }

    return messageId;
  }

  async sendButtonsMessage(
    jid: string,
    params: {
      text: string;
      footerText?: string;
      buttons: ButtonOption[];
    },
  ): Promise<string | null> {
    if (!config.WA_INTERACTIVE_MESSAGES_ENABLED) return null;
    if (!this.sock || this.state !== 'open') {
      throw new ServiceUnavailableError('WhatsApp not connected');
    }
    return sendInteractiveButtons(this.sock, jid, params);
  }
}
