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
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY_MS = 1_000;

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
  private readonly msgRetryCounterCache = new NodeCache();
  private inbox: InboxService | null = null;

  constructor(sessionDir?: string) {
    this.sessionDir = sessionDir ?? config.WA_SESSION_DIR;
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
    if (this.sock) {
      this.logger.warn('Ending existing socket before re-initializing');
      try { this.sock.end(undefined); } catch { /* ignore */ }
      this.sock = null;
    }

    this.reconnectAttempts = 0;

    const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);

    this.sock = makeWASocket({
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
      getMessage: async (_key: WAMessageKey): Promise<WAMessageContent | undefined> => {
        return undefined;
      },
    });

    this.setupEventHandlers(saveCreds);
    this.logger.info('WhatsApp service initialized');
  }

  private setupEventHandlers(saveCreds: () => Promise<void>): void {
    if (!this.sock) return;

    this.sock.ev.on('connection.update', async (update) => {
      await this.handleConnectionUpdate(update, saveCreds);
    });

    this.sock.ev.on('creds.update', async () => {
      await saveCreds();
      this.logger.debug('Credentials saved');
    });

    this.sock.ev.on('messages.upsert', (upsert) => {
      if (upsert.type !== 'notify') return;
      if (!this.inbox) return;

      for (const msg of upsert.messages) {
        void this.inbox.handleIncomingMessage(msg);
      }
    });
  }

  private async handleConnectionUpdate(
    update: { connection?: string; lastDisconnect?: { error?: Boom | Error }; qr?: string },
    _saveCreds: () => Promise<void>,
  ): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.qr = qr;
      this.state = 'connecting';
      this.logger.info('QR code received — scan with WhatsApp');
      emitToAll('qr', { qr, timeout: QR_TIMEOUT_MS });

      console.log('\n');
      console.log('╔══════════════════════════════════════════╗');
      console.log('║  Scan this QR code with WhatsApp         ║');
      console.log('║  Settings → Linked Devices → Link        ║');
      console.log('╚══════════════════════════════════════════╝');
      console.log('\n');
      qrCodeTerminal.generate(qr, { small: true }, (code: string) => {
        console.log(code);
      });
      console.log('\n');

      setTimeout(() => {
        if (this.qr === qr) {
          this.qr = null;
          this.logger.warn('QR code expired — waiting for new one');
        }
      }, QR_TIMEOUT_MS);
    }

    if (connection === 'close') {
      const error = lastDisconnect?.error;
      const statusCode = error && 'output' in error
        ? (error as Boom).output?.statusCode
        : undefined;

      this.logger.warn({ statusCode }, 'Connection closed');

      if (statusCode === DisconnectReason.restartRequired) {
        this.logger.info('restartRequired received — reconnecting with saved credentials');
        this.reconnectAttempts = 0;
        this.state = 'close';
        this.qr = null;
        emitToAll('connection-status', {
          state: 'connecting',
          timestamp: new Date().toISOString(),
        });
        await this.initialize();
        return;
      }

      if (statusCode === DisconnectReason.loggedOut) {
        this.state = 'close';
        this.qr = null;
        this.connectedAt = null;
        this.userJid = null;
        this.reconnectAttempts = 0;
        this.logger.fatal('Logged out — a new QR scan is required');
        emitToAll('connection-status', {
          state: 'close',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (statusCode === DisconnectReason.forbidden) {
        this.state = 'close';
        this.logger.fatal('Account forbidden — access denied by WhatsApp');
        emitToAll('connection-status', {
          state: 'close',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        const delay = Math.min(
          RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1),
          30_000,
        );
        this.logger.info({ attempt: this.reconnectAttempts, delay }, 'Reconnecting...');
        emitToAll('connection-status', {
          state: 'connecting',
          timestamp: new Date().toISOString(),
        });
        setTimeout(() => this.initialize(), delay);
      } else {
        this.state = 'close';
        this.logger.fatal('Max reconnect attempts reached — giving up');
        emitToAll('connection-status', {
          state: 'close',
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (connection === 'open') {
      this.state = 'open';
      this.qr = null;
      this.connectedAt = new Date().toISOString();
      this.reconnectAttempts = 0;
      this.userJid = this.sock?.user?.id ?? null;
      this.logger.info({ userJid: this.userJid }, 'WhatsApp connected successfully');
      emitToAll('connection-status', {
        state: 'open',
        timestamp: this.connectedAt,
      });
    }
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

      if (this.inbox) {
        const conversation = await this.inbox.upsertConversationForOutgoing(
          phone,
          jid,
          text,
          timestamp,
        );
        await this.inbox.recordOutgoingMessage({
          conversationId: conversation._id,
          phone,
          jid,
          messageId,
          content: text,
          type: 'text',
          status: 'sent',
          timestamp,
          requestId,
        });
      }

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
          this.logger.error(
            { err: persistErr, messageId: 'unknown' },
            'Failed to persist failed-message record',
          );
        }
      }

      throw err;
    }
  }

  onIncomingMessage(msg: WAMessage): void {
    if (this.inbox) {
      void this.inbox.handleIncomingMessage(msg);
    }
  }

  async logout(): Promise<void> {
    if (this.sock) {
      this.sock.end(undefined);
      this.sock = null;
    }
    this.state = 'close';
    this.qr = null;
    this.connectedAt = null;
    this.userJid = null;
    this.reconnectAttempts = 0;
    this.logger.info('WhatsApp logged out');
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
  ): Promise<string | null> {
    if (!this.sock || this.state !== 'open') {
      throw new ServiceUnavailableError('WhatsApp not connected');
    }
    return sendInteractiveList(this.sock, jid, params);
  }

  /**
   * Send interactive reply buttons to a user.
   * Falls back to plain text if unsupported.
   */
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
