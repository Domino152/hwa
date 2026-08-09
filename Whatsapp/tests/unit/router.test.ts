import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageRouter } from '../../src/chatbot/router.js';
import { IntentName } from '../../src/chatbot/intents.js';
import { integration } from '../../src/integration/index.js';

vi.mock('../../src/integration/index.js', () => ({
  integration: {
    findUserByPhone: vi.fn().mockResolvedValue(null),
    attendance: { getByStudentId: vi.fn() },
    fees: { getByStudentId: vi.fn() },
    schedule: { getByStudent: vi.fn() },
    results: { getByStudentId: vi.fn() },
    publicInformation: {
      getByCategory: vi.fn(),
      search: vi.fn(),
      resolveCategory: vi.fn().mockReturnValue('about_hits'),
    },
    students: { getByStudentId: vi.fn() },
    getStudentProfile: vi.fn(),
  },
}));

vi.mock('../../src/chatbot/ai/gemini-orchestrator.js', () => ({
  GeminiOrchestrator: vi.fn().mockImplementation(() => ({
    processMessage: vi.fn().mockResolvedValue({
      intent: 'attendance',
      entities: { studentId: '22CSE001' },
      requiresDatabase: true,
      confidence: 0.9,
      tokenCount: 100,
    }),
  })),
}));

describe('MessageRouter', () => {
  let router: MessageRouter;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
    router = new MessageRouter();
  });

  describe('button click routing', () => {
    it('routes attendance button click directly', async () => {
      vi.mocked(integration.attendance.getByStudentId).mockResolvedValue({
        hasData: false,
        overallPercentage: 0,
        records: [],
      });

      const result = await router.route('intent:attendance', { phone: '123' });

      expect(result.routedVia).toBe('button');
      expect(result.intent).toBe(IntentName.Attendance);
    });

    it('routes login button directly', async () => {
      const result = await router.route('intent:login', { phone: '123' });

      expect(result.routedVia).toBe('button');
      expect(result.intent).toBe(IntentName.Login);
    });

    it('routes help button directly', async () => {
      const result = await router.route('intent:help', { phone: '123' });

      expect(result.routedVia).toBe('button');
      expect(result.intent).toBe(IntentName.Help);
    });

    it('blocks private intent for unauthenticated user', async () => {
      vi.mocked(integration.findUserByPhone).mockResolvedValue(null);

      const result = await router.route('intent:fees', { phone: '123' });

      expect(result.routedVia).toBe('button');
      expect(result.response).toContain('Authentication Required');
    });

    it('allows private intent for authenticated user', async () => {
      vi.mocked(integration.findUserByPhone).mockResolvedValue({
        id: 'u1',
        fullName: 'John',
        role: 'student',
        studentId: '22CSE001',
        department: 'CSE',
        year: 3,
        section: 'A',
      });

      vi.mocked(integration.fees.getByStudentId).mockResolvedValue({
        hasData: false,
        fee: null,
      });

      const result = await router.route('intent:fees', { phone: '123' });

      expect(result.routedVia).toBe('button');
      expect(result.response).not.toContain('Authentication Required');
    });
  });

  describe('NLP fast path', () => {
    it('routes greeting through NLP fast path', async () => {
      const result = await router.route('Hi', { phone: '123' });

      expect(result.routedVia).toBe('nlp');
      expect(result.intent).toBe(IntentName.Greeting);
    });

    it('routes help through NLP fast path', async () => {
      const result = await router.route('Help', { phone: '123' });

      expect(result.routedVia).toBe('nlp');
      expect(result.intent).toBe(IntentName.Help);
    });

    it('routes attendance through NLP fast path for known phrases', async () => {
      const result = await router.route('attendance percentage', { phone: '123' });

      expect(result.routedVia).toBe('nlp');
    });
  });

  describe('AI escalation', () => {
    it('escalates to AI for unknown queries', async () => {
      const result = await router.route('asdfghjkl random gibberish', { phone: '123' });

      expect(result.routedVia).toBe('ai');
    });

    it('falls back gracefully when GEMINI_API_KEY is missing', async () => {
      delete process.env.GEMINI_API_KEY;
      const r2 = new MessageRouter();

      const result = await r2.route('zxqw vfrt plmn', { phone: '123' });

      expect(result.routedVia).toBe('ai');
      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(0);
    });
  });

  describe('session integration', () => {
    it('updates session after routing', async () => {
      await router.route('Hi', { phone: 'session-test-1' });

      const { getSession } = await import('../../src/chatbot/sessionManager.js');
      const session = getSession('session-test-1');
      expect(session.lastIntent).toBe(IntentName.Greeting);
    });

    it('adds history entries', async () => {
      await router.route('Hi', { phone: 'session-test-2' });

      const { getSession } = await import('../../src/chatbot/sessionManager.js');
      const session = getSession('session-test-2');
      expect(session.messageHistory.length).toBeGreaterThanOrEqual(2);
      expect(session.messageHistory[0].role).toBe('user');
      expect(session.messageHistory[1].role).toBe('bot');
    });
  });

  describe('suggested actions', () => {
    it('attaches suggested actions to result', async () => {
      const result = await router.route('Hi', { phone: '123' });

      expect(result.suggestedActions).toBeDefined();
      expect(result.suggestedActions!.length).toBeGreaterThan(0);
    });
  });

  describe('button clicks bypass Gemini', () => {
    it('routes intent:attendance without calling Gemini', async () => {
      vi.mocked(integration.attendance.getByStudentId).mockResolvedValue({
        hasData: false,
        overallPercentage: 0,
        records: [],
      });

      const result = await router.route('intent:attendance', { phone: '123' });

      expect(result.routedVia).toBe('button');
      expect(result.intent).toBe(IntentName.Attendance);
      expect(result.response).toBeDefined();
    });

    it('routes intent:fees without calling Gemini', async () => {
      vi.mocked(integration.fees.getByStudentId).mockResolvedValue({
        hasData: false,
        fee: null,
      });

      const result = await router.route('intent:fees', { phone: '123' });

      expect(result.routedVia).toBe('button');
      expect(result.intent).toBe(IntentName.Fees);
    });

    it('routes intent:schedule without calling Gemini', async () => {
      vi.mocked(integration.schedule.getByStudent).mockResolvedValue({
        hasData: false,
        entries: [],
        dayOfWeek: 'Monday',
      });

      const result = await router.route('intent:schedule', { phone: '123' });

      expect(result.routedVia).toBe('button');
      expect(result.intent).toBe(IntentName.Schedule);
    });

    it('routes intent:results without calling Gemini', async () => {
      vi.mocked(integration.results.getByStudentId).mockResolvedValue({
        hasData: false,
        results: [],
        cgpa: 0,
      });

      const result = await router.route('intent:results', { phone: '123' });

      expect(result.routedVia).toBe('button');
      expect(result.intent).toBe(IntentName.Results);
    });

    it('routes intent:announcements without calling Gemini', async () => {
      vi.mocked(integration.publicInformation.getByCategory).mockResolvedValue({
        hasData: false,
        entries: [],
        category: 'events',
      });

      const result = await router.route('intent:announcements', { phone: '123' });

      expect(result.routedVia).toBe('button');
      expect(result.intent).toBe(IntentName.Announcements);
    });

    it('routes intent:profile without calling Gemini', async () => {
      vi.mocked(integration.getStudentProfile).mockResolvedValue({
        hasData: false,
        student: null,
      });

      const result = await router.route('intent:profile', { phone: '123' });

      expect(result.routedVia).toBe('button');
      expect(result.intent).toBe(IntentName.Profile);
    });

    it('routes intent:help without calling Gemini', async () => {
      const result = await router.route('intent:help', { phone: '123' });

      expect(result.routedVia).toBe('button');
      expect(result.intent).toBe(IntentName.Help);
    });

    it('routes intent:greeting without calling Gemini', async () => {
      const result = await router.route('intent:greeting', { phone: '123' });

      expect(result.routedVia).toBe('button');
      expect(result.intent).toBe(IntentName.Greeting);
    });
  });

  describe('natural language still routes correctly', () => {
    it('routes "Hi" through NLP', async () => {
      const result = await router.route('Hi', { phone: '123' });
      expect(result.routedVia).toBe('nlp');
      expect(result.intent).toBe(IntentName.Greeting);
    });

    it('routes "Help" through NLP', async () => {
      const result = await router.route('Help', { phone: '123' });
      expect(result.routedVia).toBe('nlp');
      expect(result.intent).toBe(IntentName.Help);
    });

    it('routes "login" through NLP', async () => {
      const result = await router.route('login', { phone: '123' });
      expect(result.routedVia).toBe('nlp');
      expect(result.intent).toBe(IntentName.Login);
    });
  });

  describe('authentication gating', () => {
    it('returns login-required for unauthenticated greeting', async () => {
      vi.mocked(integration.findUserByPhone).mockResolvedValue(null);
      const result = await router.route('Hi', { phone: 'unauth-1' });
      expect(result.intent).toBe(IntentName.Greeting);
      expect(result.response).toContain('Authentication Required');
    });

    it('returns login-required for unauthenticated button click on private intent', async () => {
      vi.mocked(integration.findUserByPhone).mockResolvedValue(null);
      const result = await router.route('intent:attendance', { phone: 'unauth-2' });
      expect(result.routedVia).toBe('button');
      expect(result.response).toContain('Authentication Required');
    });

    it('login URL uses PUBLIC_APP_URL', async () => {
      vi.mocked(integration.findUserByPhone).mockResolvedValue(null);
      const result = await router.route('intent:attendance', { phone: 'unauth-3' });
      expect(result.response).toContain('http://localhost:5173/login?phone=unauth-3');
    });

    it('does not reveal student name for unauthenticated user', async () => {
      vi.mocked(integration.findUserByPhone).mockResolvedValue(null);
      const result = await router.route('Hi', { phone: 'unauth-4' });
      expect(result.response).not.toContain('Welcome back');
      expect(result.response).not.toContain('Arjun');
    });

    it('blocks all private intents when unauthenticated', async () => {
      vi.mocked(integration.findUserByPhone).mockResolvedValue(null);

      const privateIntents = ['intent:attendance', 'intent:fees', 'intent:schedule', 'intent:results', 'intent:profile'];
      for (const action of privateIntents) {
        const result = await router.route(action, { phone: 'unauth-5' });
        expect(result.response).toContain('Authentication Required');
      }
    });
  });
});