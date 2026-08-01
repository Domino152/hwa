export type ConnectionState = 'connecting' | 'open' | 'close';

export interface QRData {
  qr: string;
  timeout: number;
}

export interface SendMessagePayload {
  phone: string;
  message: string;
}

export interface WhatsAppServiceStatus {
  state: ConnectionState;
  qr: string | null;
  connectedAt: string | null;
  reconnectAttempts: number;
  userJid: string | null;
}
