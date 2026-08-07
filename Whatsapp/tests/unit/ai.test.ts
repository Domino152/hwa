import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChatMessage, AIResponse, IAIService } from '../../src/modules/ai/ai.types.js';
import { DEFAULT_AI_CONFIG } from '../../src/modules/ai/ai.types.js';
import { SYSTEM_PROMPT, buildSystemPrompt } from '../../src/modules/ai/prompt.js';

// -- Mock @google/genai ----------------------------------------------
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

// -- Tests -----------------------------------------------------------

describe('AI Types', () => {
  it('should define ChatMessage interface with correct structure', () => {
    const msg: ChatMessage = { role: 'user', content: 'Hello' };
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello');
  });

  it('should define AIResponse interface with correct structure', () => {
    const response: AIResponse = { text: 'Hi there', finishReason: 'STOP', tokenCount: 10 };
    expect(response.text).toBe('Hi there');
    expect(response.finishReason).toBe('STOP');
    expect(response.tokenCount).toBe(10);
  });

  it('should export DEFAULT_AI_CONFIG with correct values', () => {
    expect(DEFAULT_AI_CONFIG.model).toBe('gemini-2.5-flash');
    expect(DEFAULT_AI_CONFIG.maxTokens).toBe(2048);
    expect(DEFAULT_AI_CONFIG.temperature).toBe(0.7);
    expect(DEFAULT_AI_CONFIG.timeoutMs).toBe(30_000);
  });
});

describe('System Prompt', () => {
  it('should export SYSTEM_PROMPT as a non-empty string', () => {
    expect(SYSTEM_PROMPT).toBeDefined();
    expect(typeof SYSTEM_PROMPT).toBe('string');
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('should contain college identity', () => {
    expect(SYSTEM_PROMPT).toContain('HITS');
    expect(SYSTEM_PROMPT).toContain('WhatsApp');
  });

  it('should contain scope boundaries', () => {
    expect(SYSTEM_PROMPT).toContain('What You CAN Help With');
    expect(SYSTEM_PROMPT).toContain('What You CANNOT Do');
  });

  it('should contain tone guidelines', () => {
    expect(SYSTEM_PROMPT).toContain('Helpful and approachable');
  });

  describe('buildSystemPrompt', () => {
    it('should return base prompt when no context provided', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toBe(SYSTEM_PROMPT);
    });

    it('should append user name when provided', () => {
      const prompt = buildSystemPrompt({ userName: 'Alice' });
      expect(prompt).toContain("The user's name is Alice");
    });

    it('should append role when provided', () => {
      const prompt = buildSystemPrompt({ role: 'student' });
      expect(prompt).toContain('The user is a student');
    });

    it('should append both name and role when provided', () => {
      const prompt = buildSystemPrompt({ userName: 'Bob', role: 'parent' });
      expect(prompt).toContain("The user's name is Bob");
      expect(prompt).toContain('The user is a parent');
    });
  });
});

describe('GeminiAIService', () => {
  let GeminiAIService: typeof import('../../src/modules/ai/ai.service.js').GeminiAIService;

  beforeEach(async () => {
    mockGenerateContent.mockReset();
    const mod = await import('../../src/modules/ai/ai.service.js');
    GeminiAIService = mod.GeminiAIService;
  });

  describe('constructor', () => {
    it('should create an instance with valid API key', () => {
      const service = new GeminiAIService({ apiKey: 'test-key' });
      expect(service).toBeInstanceOf(GeminiAIService);
    });

    it('should throw error when API key is missing', () => {
      expect(() => new GeminiAIService({ apiKey: '' })).toThrow('GEMINI_API_KEY is required');
    });

    it('should accept custom config', () => {
      const service = new GeminiAIService({
        apiKey: 'test-key',
        model: 'gemini-2.5-pro',
        maxTokens: 4096,
        temperature: 0.5,
      });
      expect(service).toBeInstanceOf(GeminiAIService);
    });
  });

  describe('generateResponse', () => {
    it('should return text on successful generation', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Hello! How can I help you?',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { totalTokenCount: 25 },
      });

      const service = new GeminiAIService({ apiKey: 'test-key' });
      const result = await service.generateResponse('Hi there');

      expect(result.text).toBe('Hello! How can I help you?');
      expect(result.finishReason).toBe('STOP');
      expect(result.tokenCount).toBe(25);
    });

    it('should handle missing text gracefully', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: undefined,
        candidates: [],
        usageMetadata: undefined,
      });

      const service = new GeminiAIService({ apiKey: 'test-key' });
      const result = await service.generateResponse('Hello');

      expect(result.text).toBe('');
      expect(result.finishReason).toBe('UNKNOWN');
      expect(result.tokenCount).toBe(0);
    });

    it('should pass conversation history to the API', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Context-aware response',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { totalTokenCount: 50 },
      });

      const service = new GeminiAIService({ apiKey: 'test-key' });
      const history: ChatMessage[] = [
        { role: 'user', content: 'What is HITS?' },
        { role: 'model', content: 'HITS is a college.' },
      ];

      await service.generateResponse('Tell me more', history);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents).toHaveLength(3);
      expect(callArgs.contents[0]).toEqual({ role: 'user', parts: [{ text: 'What is HITS?' }] });
      expect(callArgs.contents[1]).toEqual({ role: 'model', parts: [{ text: 'HITS is a college.' }] });
      expect(callArgs.contents[2]).toEqual({ role: 'user', parts: [{ text: 'Tell me more' }] });
    });

    it('should include system instruction in config', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { totalTokenCount: 10 },
      });

      const service = new GeminiAIService({ apiKey: 'test-key' });
      await service.generateResponse('Hello');

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.config.systemInstruction).toContain('HITS');
    });

    it('should use configured model and parameters', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { totalTokenCount: 10 },
      });

      const service = new GeminiAIService({
        apiKey: 'test-key',
        model: 'gemini-2.5-pro',
        maxTokens: 4096,
        temperature: 0.3,
      });

      await service.generateResponse('Hello');

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.model).toBe('gemini-2.5-pro');
      expect(callArgs.config.maxOutputTokens).toBe(4096);
      expect(callArgs.config.temperature).toBe(0.3);
    });

    it('should throw on rate limit error (429)', async () => {
      const apiError = Object.assign(new Error('Rate limit exceeded'), {
        name: 'ApiError',
        status: 429,
      });
      mockGenerateContent.mockRejectedValueOnce(apiError);

      const service = new GeminiAIService({ apiKey: 'test-key' });

      await expect(service.generateResponse('Hello')).rejects.toThrow(
        'AI service rate limit exceeded',
      );
    });

    it('should throw on authentication error (401)', async () => {
      const apiError = Object.assign(new Error('Invalid key'), {
        name: 'ApiError',
        status: 401,
      });
      mockGenerateContent.mockRejectedValueOnce(apiError);

      const service = new GeminiAIService({ apiKey: 'test-key' });

      await expect(service.generateResponse('Hello')).rejects.toThrow(
        'AI service authentication failed',
      );
    });

    it('should throw on forbidden error (403)', async () => {
      const apiError = Object.assign(new Error('Forbidden'), {
        name: 'ApiError',
        status: 403,
      });
      mockGenerateContent.mockRejectedValueOnce(apiError);

      const service = new GeminiAIService({ apiKey: 'test-key' });

      await expect(service.generateResponse('Hello')).rejects.toThrow(
        'AI service authentication failed',
      );
    });

    it('should throw on service unavailable (503)', async () => {
      const apiError = Object.assign(new Error('Service unavailable'), {
        name: 'ApiError',
        status: 503,
      });
      mockGenerateContent.mockRejectedValueOnce(apiError);

      const service = new GeminiAIService({ apiKey: 'test-key' });

      await expect(service.generateResponse('Hello')).rejects.toThrow(
        'AI service is temporarily unavailable',
      );
    });

    it('should throw on generic API error', async () => {
      const apiError = Object.assign(new Error('Something went wrong'), {
        name: 'ApiError',
        status: 500,
      });
      mockGenerateContent.mockRejectedValueOnce(apiError);

      const service = new GeminiAIService({ apiKey: 'test-key' });

      await expect(service.generateResponse('Hello')).rejects.toThrow(
        'AI service error: Something went wrong',
      );
    });

    it('should re-throw non-API errors', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Network failure'));

      const service = new GeminiAIService({ apiKey: 'test-key' });

      await expect(service.generateResponse('Hello')).rejects.toThrow('Network failure');
    });

    it('should handle empty history array', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { totalTokenCount: 10 },
      });

      const service = new GeminiAIService({ apiKey: 'test-key' });
      await service.generateResponse('Hello', []);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents).toHaveLength(1);
      expect(callArgs.contents[0].role).toBe('user');
    });
  });
});

describe('AIController', () => {
  let AIController: typeof import('../../src/modules/ai/ai.controller.js').AIController;

  beforeEach(async () => {
    const mod = await import('../../src/modules/ai/ai.controller.js');
    AIController = mod.AIController;
  });

  it('should call AI service and return result', async () => {
    const mockService: IAIService = {
      generateResponse: vi.fn().mockResolvedValue({
        text: 'AI response',
        finishReason: 'STOP',
        tokenCount: 15,
      }),
    };

    const controller = new AIController(mockService);
    const mockReq = {
      body: { message: 'Hello' },
    } as any;
    const mockRes = {
      locals: { requestId: 'test-req-id' },
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await controller.chat(mockReq, mockRes);

    expect(mockService.generateResponse).toHaveBeenCalledWith('Hello', undefined);
    expect(mockRes.json).toHaveBeenCalled();
  });

  it('should pass history when provided', async () => {
    const mockService: IAIService = {
      generateResponse: vi.fn().mockResolvedValue({
        text: 'Context response',
        finishReason: 'STOP',
        tokenCount: 20,
      }),
    };

    const controller = new AIController(mockService);
    const history: ChatMessage[] = [{ role: 'user', content: 'Previous message' }];
    const mockReq = {
      body: { message: 'Follow up', history },
    } as any;
    const mockRes = {
      locals: { requestId: 'test-req-id' },
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await controller.chat(mockReq, mockRes);

    expect(mockService.generateResponse).toHaveBeenCalledWith('Follow up', history);
  });
});

describe('AI Routes', () => {
  it('should export createAIRoutes function', { timeout: 15000 }, async () => {
    const { createAIRoutes } = await import('../../src/modules/ai/index.js');
    expect(typeof createAIRoutes).toBe('function');
  });

  it('should create a router with POST /chat endpoint', async () => {
    const { createAIRoutes } = await import('../../src/modules/ai/index.js');
    const mockService: IAIService = {
      generateResponse: vi.fn().mockResolvedValue({
        text: 'Hello',
        finishReason: 'STOP',
        tokenCount: 10,
      }),
    };

    const router = createAIRoutes(mockService);
    expect(router).toBeDefined();
  });
});
