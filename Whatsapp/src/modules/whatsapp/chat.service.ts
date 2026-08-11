import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  Browsers,
  type WAMessage,
  type WAMessageContent,
  type WAMessageKey,
  type WASocket,
} from 'baileys';
import type pino from 'pino';
import { Boom } from '@hapi/boom';
import NodeCache from '@cacheable/node-cache';
import { config } from '../../config/index.js';
import { emitToAll } from '../../sockets/index.js';
import logger from '../../shared/utils/logger.js';
import { ServiceUnavailableError } from '../../shared/utils/errors.js';
import { extractPhoneFromJid } from './utils/phone.js';
import { InboxService } from './inbox.service.js';
import { Conversation } from '../../database/models/Conversation.js';
import type { WhatsAppServiceStatus } from '../../shared/types/whatsapp.js';
import qrCodeTerminal from 'qrcode-terminal';
import {
  sendListMessage as sendInteractiveList,
  sendButtonsMessage as sendInteractiveButtons,
  type ButtonOption,
  type ListSection,
} from '../../chatbot/interactive.js';

type ConnectionStateStr = 'connecting' | 'open' | 'close';

const QR_TIMEOUT_MS = 60_000;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const CONNECTING_STALE_MIN_MS = 60_000;

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

  constructor(sessionDir?: string, watchdogIntervalMs?: number) {
    this.sessionDir = sessionDir ?? config.WA_SESSION_DIR;
    this.watchdogIntervalMs = watchdogIntervalMs ?? config.WA_WATCHDOG_INTERVAL_MS;
    this.logger = logger.child({ module: 'whatsapp' });
    this.baileysLogger = logger.child(
      { module: 'whatsapp-baileys' },
      { level: 'warn' },
    );
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
      try { oldSocket.end(undefined); } catch { /* already closed */ }
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
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
      getMessage: (_key: WAMessageKey): Promise<WAMessageContent | undefined> => Promise.resolve(undefined),
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
  }

  private handleConnectionUpdate(
    update: { connection?: string; lastDisconnect?: { error?: Boom | Error }; qr?: string },
  ): void {
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
      const statusCode = error && 'output' in error
        ? (error as Boom).output?.statusCode
        : undefined;

      this.logger.warn({ statusCode }, 'Connection closed');
      this.state = 'close';
      this.connectedAt = null;
      this.userJid = null;
      if (this.sock) {
        try { this.sock.end(undefined); } catch { /* already closed */ }
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
        if (
          statusCode === DisconnectReason.loggedOut
          && !this.invalidSessionQrAttempted
        ) {
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
    const delay = delayOverride ?? Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, exponent),
      RECONNECT_MAX_DELAY_MS,
    );
    this.logger.info({ attempt: this.reconnectAttempts, delayMs: delay }, 'WhatsApp reconnect scheduled');
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

    const connectingTooLong = this.state === 'connecting'
      && Date.now() - this.connectingSince >= Math.max(
        CONNECTING_STALE_MIN_MS,
        this.watchdogIntervalMs * 2,
      );
    const stale = this.state === 'close'
      || (this.state === 'open' && !this.sock?.ws.isOpen)
      || connectingTooLong;
    if (!stale) return;

    this.watchdogHealthyLogged = false;
    this.logger.warn(
      { state: this.state, socketOpen: this.sock?.ws.isOpen ?? false },
      'WhatsApp watchdog detected stale connection',
    );
    if (this.sock) {
      try { this.sock.end(undefined); } catch { /* already closed */ }
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
  ): Promise<{ messageId: string }> {
    if (!this.sock || this.state !== 'open') {
      throw new ServiceUnavailableError('WhatsApp not connected');
    }

    const phone = extractPhoneFromJid(jid);
    const timestamp = new Date();

    try {
      const result = await this.sock.sendMessage(jid, { text });
      const messageId = result?.key?.id ?? 'unknown';
      this.logger.info({ jid, messageId, requestId }, 'Message sent');
      await this.persistOutgoingMessage({ phone, jid, text, timestamp, messageId, requestId });
      return { messageId };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
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
      await this.inbox.recordOutgoingMessage({
        conversationId: conversation._id,
        phone: params.phone,
        jid: params.jid,
        messageId: params.messageId,
        content: params.text,
        type: 'text',
        status: 'sent',
        timestamp: params.timestamp,
        requestId: params.requestId,
      });
    } catch (err) {
      this.logger.error({ err, messageId: params.messageId }, 'Message sent but persistence failed');
    }
  }

  onIncomingMessage(msg: WAMessage): void {
    if (!this.inbox) return;
    void this.inbox.handleIncomingMessage(msg).catch((err) => {
      this.logger.error({ err, msgKey: msg.key }, 'Incoming message processing failed');
    });
  }

  logout(): Promise<void> {
    this.shutdown();
    return Promise.resolve();
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

  async sendListMessage(
    jid: string,
    params: {
      title: string;
      description: string;
      buttonText: string;
      footerText?: string;
      sections: ListSection[];
    },
  ): Promise<string | null> {
    if (!this.sock || this.state !== 'open') {
      throw new ServiceUnavailableError('WhatsApp not connected');
    }
    return sendInteractiveList(this.sock, jid, params);
  }

  async sendButtonsMessage(
    jid: string,
    params: {
      text: string;
      footerText?: string;
      buttons: ButtonOption[];
    },
  ): Promise<string | null> {
    if (!this.sock || this.state !== 'open') {
      throw new ServiceUnavailableError('WhatsApp not connected');
    }
    return sendInteractiveButtons(this.sock, jid, params);
  }
}
