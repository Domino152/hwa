export type ConnectionState = 'connecting' | 'open' | 'close';

export interface QRData {
  qr: string;
  timeout: number;
}

export interface SendMessagePayload {
  phone: string;
  message: string;
}

export interface SendMessageResponse {
  messageId: string;
  jid: string;
  phone: string;
}

export interface WhatsAppServiceStatus {
  state: ConnectionState;
  qr: string | null;
  connectedAt: string | null;
  reconnectAttempts: number;
  userJid: string | null;
}

export interface ConversationListItem {
  id: string;
  phone: string;
  jid: string;
  contactName?: string;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageDirection: 'incoming' | 'outgoing';
  unreadCount: number;
}

export interface ConversationListResult {
  conversations: ConversationListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface MessageListItem {
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
}

export interface MessageListResult {
  messages: MessageListItem[];
  total: number;
  page: number;
  limit: number;
}
