import type { ConnectionState as BaileysConnectionState } from 'baileys';
import type pino from 'pino';

export interface WhatsAppConfig {
  sessionDir: string;
  logger: pino.Logger;
  onQR?: (qr: string) => void;
  onConnectionUpdate?: (state: BaileysConnectionState) => void;
  onCredsUpdate?: () => void;
}

export type { BaileysConnectionState };
