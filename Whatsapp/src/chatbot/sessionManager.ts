import type { IntentName } from './intents.js';
import logger from '../shared/utils/logger.js';

const sessionLogger = logger.child({ module: 'chatbot-session' });

export interface ChatSession {
  phone: string;
  greetingSent: boolean;
  lastIntent: IntentName | null;
  lastInteraction: number;
  messageHistory: HistoryEntry[];
  context: Record<string, unknown>;
}

export interface HistoryEntry {
  role: 'user' | 'bot';
  text: string;
  intent?: IntentName;
  timestamp: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_HISTORY = 20;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const sessions = new Map<string, ChatSession>();

let lastCleanup = Date.now();

function maybeCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [phone, session] of sessions) {
    if (now - session.lastInteraction > SESSION_TTL_MS) {
      sessions.delete(phone);
    }
  }
}

export function getSession(phone: string): ChatSession {
  maybeCleanup();

  const existing = sessions.get(phone);
  if (existing) {
    existing.lastInteraction = Date.now();
    return existing;
  }

  const session: ChatSession = {
    phone,
    greetingSent: false,
    lastIntent: null,
    lastInteraction: Date.now(),
    messageHistory: [],
    context: {},
  };

  sessions.set(phone, session);
  sessionLogger.debug({ phone }, 'New chat session created');
  return session;
}

export function markGreetingSent(phone: string): void {
  const session = getSession(phone);
  session.greetingSent = true;
}

export function updateSessionIntent(phone: string, intent: IntentName): void {
  const session = getSession(phone);
  session.lastIntent = intent;
}

export function addHistoryEntry(
  phone: string,
  entry: HistoryEntry,
): void {
  const session = getSession(phone);
  session.messageHistory.push(entry);

  if (session.messageHistory.length > MAX_HISTORY) {
    session.messageHistory = session.messageHistory.slice(-MAX_HISTORY);
  }
}

export function getConversationHistory(phone: string, limit: number = 5): HistoryEntry[] {
  const session = getSession(phone);
  return session.messageHistory.slice(-limit);
}

export function setSessionContext(phone: string, key: string, value: unknown): void {
  const session = getSession(phone);
  session.context[key] = value;
}

export function getSessionContext<T = unknown>(phone: string, key: string): T | undefined {
  const session = getSession(phone);
  return session.context[key] as T | undefined;
}

export function clearSession(phone: string): void {
  sessions.delete(phone);
}

export function getSessionCount(): number {
  return sessions.size;
}
