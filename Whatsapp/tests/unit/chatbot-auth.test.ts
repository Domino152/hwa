import { describe, it, expect, vi } from 'vitest';
import { generateResponse, IntentName, PRIVATE_INTENTS } from '../../src/chatbot/index.js';
import type { ChatbotContext } from '../../src/chatbot/intents.js';

vi.mock('../../src/database/models/User.js', () => ({
  User: { findByPhone: vi.fn().mockResolvedValue(null) },
}));

describe('Chatbot Authentication Gating', () => {
  const authenticatedContext: ChatbotContext = {
    phone: '917530063885',
    isAuthenticated: true,
    user: { id: 'u1', fullName: 'Arjun Sharma', role: 'student', studentId: '22CSE001' },
  };

  const unauthenticatedContext: ChatbotContext = {
    phone: '917530063885',
    isAuthenticated: false,
  };

  describe('Public intents work without authentication', () => {
    it('greeting works when not authenticated', () => {
      const res = generateResponse(IntentName.Greeting, unauthenticatedContext);
      expect(res).toContain('Hello');
      expect(res).toContain('Welcome');
    });

    it('help works when not authenticated', () => {
      const res = generateResponse(IntentName.Help, unauthenticatedContext);
      expect(res).toContain('Available Commands');
    });

    it('login works when not authenticated', () => {
      const res = generateResponse(IntentName.Login, unauthenticatedContext);
      expect(res).toContain('Click here');
    });

    it('syllabus works when not authenticated', () => {
      const res = generateResponse(IntentName.Syllabus, unauthenticatedContext);
      expect(res).toContain('Available Syllabus');
    });

    it('unknown works when not authenticated', () => {
      const res = generateResponse(IntentName.Unknown, unauthenticatedContext);
      expect(res).toContain("couldn't understand");
    });
  });

  describe('Private intents require authentication', () => {
    for (const intent of PRIVATE_INTENTS) {
      it(`${intent} returns login prompt when not authenticated`, () => {
        const res = generateResponse(intent, unauthenticatedContext);
        expect(res).toContain('please login');
        expect(res).toContain('Click here');
      });

      it(`${intent} returns real response when authenticated`, () => {
        const res = generateResponse(intent, authenticatedContext);
        expect(res).not.toContain('please login');
        expect(res).not.toContain('Click here');
      });
    }
  });

  describe('Greeting response varies with auth state', () => {
    it('includes user name when authenticated', () => {
      const res = generateResponse(IntentName.Greeting, authenticatedContext);
      expect(res).toContain('Arjun Sharma');
      expect(res).toContain('Welcome back');
    });

    it('does not include user name when not authenticated', () => {
      const res = generateResponse(IntentName.Greeting, unauthenticatedContext);
      expect(res).not.toContain('Arjun Sharma');
    });
  });
});
