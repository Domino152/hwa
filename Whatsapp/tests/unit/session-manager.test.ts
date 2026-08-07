import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getSession,
  markGreetingSent,
  updateSessionIntent,
  addHistoryEntry,
  getConversationHistory,
  setSessionContext,
  getSessionContext,
  clearSession,
  getSessionCount,
} from '../../src/chatbot/sessionManager.js';
import { IntentName } from '../../src/chatbot/intents.js';

describe('Session Manager', () => {
  beforeEach(() => {
    clearSession('test-user');
    clearSession('test-user-2');
  });

  it('creates a new session for unknown phone', () => {
    const session = getSession('test-user');
    expect(session.phone).toBe('test-user');
    expect(session.greetingSent).toBe(false);
    expect(session.lastIntent).toBeNull();
    expect(session.messageHistory).toEqual([]);
    expect(session.context).toEqual({});
  });

  it('returns existing session on second call', () => {
    const session1 = getSession('test-user');
    const session2 = getSession('test-user');
    expect(session1).toBe(session2);
  });

  it('creates separate sessions for different phones', () => {
    const session1 = getSession('test-user');
    const session2 = getSession('test-user-2');
    expect(session1.phone).toBe('test-user');
    expect(session2.phone).toBe('test-user-2');
  });

  it('markGreetingSent sets greetingSent to true', () => {
    markGreetingSent('test-user');
    const session = getSession('test-user');
    expect(session.greetingSent).toBe(true);
  });

  it('updateSessionIntent sets lastIntent', () => {
    updateSessionIntent('test-user', IntentName.Attendance);
    const session = getSession('test-user');
    expect(session.lastIntent).toBe(IntentName.Attendance);
  });

  it('addHistoryEntry adds entries to message history', () => {
    addHistoryEntry('test-user', {
      role: 'user',
      text: 'Hello',
      intent: IntentName.Greeting,
      timestamp: Date.now(),
    });
    addHistoryEntry('test-user', {
      role: 'bot',
      text: 'Welcome!',
      intent: IntentName.Greeting,
      timestamp: Date.now(),
    });

    const history = getConversationHistory('test-user');
    expect(history).toHaveLength(2);
    expect(history[0]!.role).toBe('user');
    expect(history[1]!.role).toBe('bot');
  });

  it('limits history to MAX_HISTORY entries', () => {
    for (let i = 0; i < 25; i++) {
      addHistoryEntry('test-user', {
        role: 'user',
        text: `Message ${i}`,
        timestamp: Date.now() + i,
      });
    }

    const history = getConversationHistory('test-user');
    expect(history.length).toBeLessThanOrEqual(20);
  });

  it('getConversationHistory respects limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      addHistoryEntry('test-user', {
        role: 'user',
        text: `Message ${i}`,
        timestamp: Date.now() + i,
      });
    }

    const history = getConversationHistory('test-user', 3);
    expect(history).toHaveLength(3);
  });

  it('setSessionContext and getSessionContext work correctly', () => {
    setSessionContext('test-user', 'lastSubject', 'DBMS');
    expect(getSessionContext<string>('test-user', 'lastSubject')).toBe('DBMS');
  });

  it('getSessionContext returns undefined for missing key', () => {
    expect(getSessionContext('test-user', 'nonexistent')).toBeUndefined();
  });

  it('clearSession removes the session', () => {
    getSession('test-user');
    expect(getSessionCount()).toBeGreaterThan(0);
    clearSession('test-user');
    const newSession = getSession('test-user');
    expect(newSession.greetingSent).toBe(false);
  });

  it('updates lastInteraction timestamp on getSession', () => {
    const session1 = getSession('test-user');
    const ts1 = session1.lastInteraction;
    // Small delay
    const session2 = getSession('test-user');
    expect(session2.lastInteraction).toBeGreaterThanOrEqual(ts1);
  });
});
