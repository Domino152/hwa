import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentName } from '../../src/chatbot/intents.js';
import { MessageRouter } from '../../src/chatbot/router.js';
import { GeminiOrchestrator } from '../../src/chatbot/ai/gemini-orchestrator.js';
import { integration } from '../../src/integration/index.js';
import { authService } from '../../src/modules/auth/index.js';

vi.mock('../../src/modules/auth/index.js', () => ({
  authService: {
    generateLoginToken: vi.fn().mockResolvedValue({ tokenId: 'tok-1', rawToken: 'gemtoken123' }),
    deactivateWhatsAppSessionByPhone: vi.fn().mockResolvedValue(undefined),
    redeemLoginToken: vi.fn(),
    login: vi.fn(),
    linkWhatsApp: vi.fn(),
    unlinkWhatsApp: vi.fn(),
  },
}));

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

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    },
  })),
  Type: { STRING: 'string', NUMBER: 'number', BOOLEAN: 'boolean', OBJECT: 'object', ARRAY: 'array' },
}));

function mockClassifyResponse(payload: unknown) {
  return {
    text: typeof payload === 'string' ? payload : JSON.stringify(payload),
    candidates: [{ finishReason: 'STOP' }],
    usageMetadata: { totalTokenCount: 42 },
  };
}

function mockApiError(status: number, message: string) {
  return Object.assign(new Error(message), { name: 'ApiError', status });
}

describe('GeminiClassifier (classify-only NLU)', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  describe('orchestrator: happy path', () => {
    it('returns structured classification for a valid attendance query', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        mockClassifyResponse({
          intent: 'attendance',
          entities: { subject: 'DBMS' },
          requiresDatabase: true,
          confidence: 0.92,
        }),
      );

      const orch = new GeminiOrchestrator('test-key', 'gemini-2.5-flash');
      const result = await orch.processMessage('how is my DBMS attendance?');

      expect(result.intent).toBe(IntentName.Attendance);
      expect(result.entities.subject).toBe('DBMS');
      expect(result.requiresDatabase).toBe(true);
      expect(result.confidence).toBeCloseTo(0.92, 2);
      expect(result.tokenCount).toBe(42);
    });

    it('returns structured classification with dateExpression entity', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        mockClassifyResponse({
          intent: 'schedule',
          entities: { dateExpression: 'tomorrow' },
          requiresDatabase: true,
          confidence: 0.81,
        }),
      );

      const orch = new GeminiOrchestrator('test-key');
      const result = await orch.processMessage("what's my timetable tomorrow?");

      expect(result.intent).toBe(IntentName.Schedule);
      expect(result.entities.dateExpression).toBe('tomorrow');
    });

    it('returns structured classification for a public_information query', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        mockClassifyResponse({
          intent: 'public_information',
          entities: { query: 'hostel fees' },
          requiresDatabase: false,
          confidence: 0.77,
        }),
      );

      const orch = new GeminiOrchestrator('test-key');
      const result = await orch.processMessage('tell me about hostel fees');

      expect(result.intent).toBe(IntentName.PublicInformation);
      expect(result.entities.query).toBe('hostel fees');
      expect(result.requiresDatabase).toBe(false);
    });

    it('clamps confidence to the [0,1] range', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        mockClassifyResponse({
          intent: 'fees',
          entities: {},
          requiresDatabase: true,
          confidence: 1.7,
        }),
      );

      const orch = new GeminiOrchestrator('test-key');
      const result = await orch.processMessage('how much do I owe?');

      expect(result.confidence).toBe(1);
    });

    it('uses the configured model name', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        mockClassifyResponse({ intent: 'unknown', entities: {}, requiresDatabase: false, confidence: 0.1 }),
      );

      const orch = new GeminiOrchestrator('test-key', 'gemini-2.5-pro');
      await orch.processMessage('hi');

      const callArgs = mockGenerateContent.mock.calls[0]![0];
      expect(callArgs.model).toBe('gemini-2.5-pro');
    });
  });

  describe('orchestrator: identity override rejection (entity sanitization)', () => {
    it('strips forbidden identity fields from entities (studentId)', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        mockClassifyResponse({
          intent: 'attendance',
          entities: { studentId: '22FAKE999', subject: 'Java' },
          requiresDatabase: true,
          confidence: 0.9,
        }),
      );

      const orch = new GeminiOrchestrator('test-key');
      const result = await orch.processMessage('attendance');

      expect(result.entities).not.toHaveProperty('studentId');
      expect(result.entities.subject).toBe('Java');
    });

    it('strips name, phone, rollNumber and other identity fields', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        mockClassifyResponse({
          intent: 'profile',
          entities: {
            name: 'Spoofed Name',
            fullName: 'Spoofed Full',
            phone: '9999999999',
            rollNumber: 'FAKE001',
            id: 'fake-id',
          },
          requiresDatabase: true,
          confidence: 0.9,
        }),
      );

      const orch = new GeminiOrchestrator('test-key');
      const result = await orch.processMessage('who am i?');

      expect(result.entities).not.toHaveProperty('name');
      expect(result.entities).not.toHaveProperty('fullName');
      expect(result.entities).not.toHaveProperty('phone');
      expect(result.entities).not.toHaveProperty('rollNumber');
      expect(result.entities).not.toHaveProperty('id');
      expect(Object.keys(result.entities)).toHaveLength(0);
    });
  });

  describe('orchestrator: graceful fallback', () => {
    it('falls back to unknown on malformed (non-JSON) response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Sure, here is what I think you want: ...',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { totalTokenCount: 10 },
      });

      const orch = new GeminiOrchestrator('test-key');
      const result = await orch.processMessage('gibberish');

      expect(result.intent).toBe(IntentName.Unknown);
      expect(result.confidence).toBe(0);
      expect(result.requiresDatabase).toBe(false);
    });

    it('falls back to unknown on empty text response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '',
        candidates: [],
        usageMetadata: { totalTokenCount: 0 },
      });

      const orch = new GeminiOrchestrator('test-key');
      const result = await orch.processMessage('??');

      expect(result.intent).toBe(IntentName.Unknown);
    });

    it('falls back to unknown on API 401 error', async () => {
      mockGenerateContent.mockRejectedValueOnce(mockApiError(401, 'Invalid key'));

      const orch = new GeminiOrchestrator('test-key');
      const result = await orch.processMessage('attendance');

      expect(result.intent).toBe(IntentName.Unknown);
    });

    it('falls back to unknown on API 429 (rate limit) error', async () => {
      mockGenerateContent.mockRejectedValueOnce(mockApiError(429, 'Rate limit'));

      const orch = new GeminiOrchestrator('test-key');
      const result = await orch.processMessage('fees');

      expect(result.intent).toBe(IntentName.Unknown);
    });

    it('falls back to unknown on network / unknown error', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Network down'));

      const orch = new GeminiOrchestrator('test-key');
      const result = await orch.processMessage('results');

      expect(result.intent).toBe(IntentName.Unknown);
    });

    it('returns unknown intent for unrecognized model intent values', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        mockClassifyResponse({
          intent: 'order_pizza',
          entities: {},
          requiresDatabase: false,
          confidence: 0.6,
        }),
      );

      const orch = new GeminiOrchestrator('test-key');
      const result = await orch.processMessage('i want pizza');

      expect(result.intent).toBe(IntentName.Unknown);
    });
  });

  describe('orchestrator: initialization', () => {
    it('throws when API key is missing', () => {
      expect(() => new GeminiOrchestrator('')).toThrow('GEMINI_API_KEY is required');
    });

    it('uses default model when not specified', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        mockClassifyResponse({ intent: 'unknown', entities: {}, requiresDatabase: false, confidence: 0.1 }),
      );

      const orch = new GeminiOrchestrator('test-key');
      await orch.processMessage('hi');

      const callArgs = mockGenerateContent.mock.calls[0]![0];
      expect(callArgs.model).toBe('gemini-2.5-flash');
    });

    it('sends a single round-trip (no tool loop) for classification', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        mockClassifyResponse({
          intent: 'attendance',
          entities: { subject: 'Java' },
          requiresDatabase: true,
          confidence: 0.9,
        }),
      );

      const orch = new GeminiOrchestrator('test-key');
      await orch.processMessage('java attendance');

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0]![0];
      expect(callArgs.config.responseMimeType).toBe('application/json');
      expect(callArgs.config.responseSchema).toBeDefined();
      expect(callArgs.config.tools).toBeUndefined();
    });
  });
});

describe('MessageRouter: classify-only wiring (bypass vs escalate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  it('does NOT call Gemini for greeting input (NLP bypass)', async () => {
    const orchSpy = vi.fn();
    const router = new MessageRouter();
    (router as unknown as { geminiOrchestrator: { processMessage: typeof orchSpy } }).geminiOrchestrator = {
      processMessage: orchSpy,
    };

    const result = await router.route('Hi', { phone: '100' });

    expect(result.routedVia).toBe('nlp');
    expect(result.intent).toBe(IntentName.Greeting);
    expect(orchSpy).not.toHaveBeenCalled();
  });

  it('does NOT call Gemini for help/login inputs (NLP bypass)', async () => {
    const orchSpy = vi.fn();
    const router = new MessageRouter();
    (router as unknown as { geminiOrchestrator: { processMessage: typeof orchSpy } }).geminiOrchestrator = {
      processMessage: orchSpy,
    };

    await router.route('help', { phone: '101' });
    await router.route('login', { phone: '102' });

    expect(orchSpy).not.toHaveBeenCalled();
  });

  it('does NOT call Gemini for button clicks (button bypass)', async () => {
    const orchSpy = vi.fn();
    vi.mocked(integration.attendance.getByStudentId).mockResolvedValue({
      hasData: false,
      overallPercentage: 0,
      records: [],
    });
    const router = new MessageRouter();
    (router as unknown as { geminiOrchestrator: { processMessage: typeof orchSpy } }).geminiOrchestrator = {
      processMessage: orchSpy,
    };

    await router.route('intent:attendance', { phone: '103' });

    expect(orchSpy).not.toHaveBeenCalled();
  });

  it('does NOT call Gemini for high-NLP-confidence known intents', async () => {
    const orchSpy = vi.fn();
    const router = new MessageRouter();
    (router as unknown as { geminiOrchestrator: { processMessage: typeof orchSpy } }).geminiOrchestrator = {
      processMessage: orchSpy,
    };

    await router.route('attendance percentage', { phone: '104' });

    expect(orchSpy).not.toHaveBeenCalled();
  });

  it('falls back to unknown when Gemini returns low confidence', async () => {
    const router = new MessageRouter();
    (router as unknown as { geminiOrchestrator: { processMessage: () => Promise<unknown> } }).geminiOrchestrator = {
      processMessage: async () => ({
        intent: IntentName.Attendance,
        entities: {},
        requiresDatabase: true,
        confidence: 0.2,
        tokenCount: 10,
      }),
    };

    const result = await router.route('completely unrelated ask', { phone: '200' });

    expect(result.routedVia).toBe('ai');
    expect(result.intent).toBe(IntentName.Unknown);
    expect(result.response.toLowerCase()).toContain("didn't quite get that");
  });

  it('falls back to unknown when Gemini API throws (graceful degradation)', async () => {
    const router = new MessageRouter();
    (router as unknown as { geminiOrchestrator: { processMessage: () => Promise<unknown> } }).geminiOrchestrator = {
      processMessage: async () => {
        throw new Error('Gemini unreachable');
      },
    };

    const result = await router.route('completely unrelated ask', { phone: '201' });

    expect(result.routedVia).toBe('ai');
    expect(result.intent).toBe(IntentName.Unknown);
    expect(result.response.length).toBeGreaterThan(0);
  });

  it('returns login-required for private intents when user is unauthenticated', async () => {
    vi.mocked(integration.findUserByPhone).mockResolvedValue(null);
    const router = new MessageRouter();
    (router as unknown as { geminiOrchestrator: { processMessage: () => Promise<unknown> } }).geminiOrchestrator = {
      processMessage: async () => ({
        intent: IntentName.Fees,
        entities: {},
        requiresDatabase: true,
        confidence: 0.95,
        tokenCount: 10,
      }),
    };

    const result = await router.route('completely unrelated ask', { phone: '202' });

    expect(result.routedVia).toBe('ai');
    expect(result.intent).toBe(IntentName.Fees);
    expect(result.response).toContain('Authentication Required');
  });

  it('identity override: ignores model-provided studentId and uses session identity', async () => {
    vi.mocked(integration.findUserByPhone).mockResolvedValue({
      id: 'u-real',
      fullName: 'Real User',
      role: 'student',
      studentId: '22CSE001',
      department: 'CSE',
      year: 4,
      section: 'A',
    });
    vi.mocked(integration.attendance.getByStudentId).mockResolvedValue({
      hasData: true,
      overallPercentage: 90,
      records: [{ subject: 'DBMS', percentage: 90, totalClasses: 50, attendedClasses: 45 }],
    });

    const router = new MessageRouter();
    (router as unknown as { geminiOrchestrator: { processMessage: () => Promise<unknown> } }).geminiOrchestrator = {
      processMessage: async () => ({
        intent: IntentName.Attendance,
        // model attempts to override identity
        entities: { studentId: '99FAKE999', name: 'Spoofed' },
        requiresDatabase: true,
        confidence: 0.95,
        tokenCount: 10,
      }),
    };

    const result = await router.route('random unrelated text', { phone: '203' });

    expect(result.routedVia).toBe('ai');
    expect(result.intent).toBe(IntentName.Attendance);
    // The real session's studentId is used, not the spoofed one.
    expect(integration.attendance.getByStudentId).toHaveBeenCalledWith('22CSE001');
  });
});
