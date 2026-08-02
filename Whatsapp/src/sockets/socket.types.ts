export interface IncomingMessageData {
  id: string;
  messageId: string;
  phone: string;
  jid: string;
  content: string;
  type: string;
  direction: 'incoming';
  status: string;
  timestamp: string;
  pushName?: string;
}

export interface ConversationSummary {
  phone: string;
  jid: string;
  contactName?: string;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageDirection: 'incoming' | 'outgoing';
  unreadCount: number;
}

export interface IncomingMessageEventPayload {
  conversationId: string;
  phone: string;
  message: IncomingMessageData;
  conversation: ConversationSummary;
}

export interface ServerToClientEvents {
  qr: (data: { qr: string; timeout: number }) => void;
  'connection-status': (data: { state: string; timestamp: string }) => void;
  log: (data: { level: string; message: string; timestamp: string }) => void;
  'incoming-message': (data: IncomingMessageEventPayload) => void;
}

export interface ClientToServerEvents {
  // Future: client-initiated events
}
