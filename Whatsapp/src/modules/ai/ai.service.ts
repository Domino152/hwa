import { GoogleGenAI } from '@google/genai';
import type { ChatMessage, AIResponse, AIServiceConfig, IAIService } from './ai.types.js';
import { DEFAULT_AI_CONFIG } from './ai.types.js';
import { buildSystemPrompt } from './prompt.js';
import { createChildLogger } from '../../shared/utils/logger.js';

const logger = createChildLogger({ module: 'ai-service' });

/**
 * GeminiAIService wraps the Google GenAI SDK.
 *
 * Responsibilities:
 * - Initialize and own the GoogleGenAI client singleton
 * - Convert ChatMessage[] history to Gemini Content[] format
 * - Generate responses with timeout and error handling
 * - Log all API interactions for observability
 *
 * Constraints:
 * - NEVER accesses MongoDB or business logic
 * - Pure LLM wrapper - receives text, returns text
 */
export class GeminiAIService implements IAIService {
  private readonly client: GoogleGenAI;
  private readonly config: AIServiceConfig;

  constructor(config?: Partial<AIServiceConfig> & { apiKey?: string }) {
    const apiKey = config?.apiKey ?? '';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required to initialize GeminiAIService');
    }

    this.config = {
      ...DEFAULT_AI_CONFIG,
      apiKey,
      model: config?.model ?? DEFAULT_AI_CONFIG.model,
      maxTokens: config?.maxTokens ?? DEFAULT_AI_CONFIG.maxTokens,
      temperature: config?.temperature ?? DEFAULT_AI_CONFIG.temperature,
      timeoutMs: config?.timeoutMs ?? DEFAULT_AI_CONFIG.timeoutMs,
    };

    this.client = new GoogleGenAI({ apiKey: this.config.apiKey });

    logger.info(
      { model: this.config.model, maxTokens: this.config.maxTokens, temperature: this.config.temperature },
      'GeminiAIService initialized',
    );
  }

  /**
   * Generate an AI response for the given user message.
   *
   * @param userMessage - The raw text from the user
   * @param history - Optional conversation history for multi-turn context
   * @returns AIResponse with the generated text, finish reason, and token count
   */
  async generateResponse(userMessage: string, history?: ChatMessage[]): Promise<AIResponse> {
    const start = Date.now();

    const contents = this.buildContents(userMessage, history);

    logger.debug(
      { messageLength: userMessage.length, historyLength: history?.length ?? 0 },
      'Generating AI response',
    );

    try {
      const response = await this.client.models.generateContent({
        model: this.config.model,
        contents,
        config: {
          systemInstruction: buildSystemPrompt(),
          maxOutputTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        },
      });

      const text = response.text ?? '';
      const finishReason = response.candidates?.[0]?.finishReason ?? 'UNKNOWN';
      const tokenCount = response.usageMetadata?.totalTokenCount ?? 0;

      const latencyMs = Date.now() - start;

      logger.info(
        {
          finishReason,
          tokenCount,
          latencyMs,
          inputLength: userMessage.length,
          outputLength: text.length,
        },
        'AI response generated',
      );

      return { text, finishReason, tokenCount };
    } catch (error) {
      const latencyMs = Date.now() - start;

      if (this.isApiError(error)) {
        logger.error(
          { errorName: error.name, errorMessage: error.message, status: error.status, latencyMs },
          'Gemini API error',
        );

        switch (error.status) {
          case 429:
            throw new Error('AI service rate limit exceeded. Please try again later.');
          case 401:
          case 403:
            throw new Error('AI service authentication failed. Check GEMINI_API_KEY configuration.');
          case 503:
            throw new Error('AI service is temporarily unavailable. Please try again later.');
          default:
            throw new Error(`AI service error: ${error.message}`);
        }
      }

      if (error instanceof DOMException && error.name === 'TimeoutError') {
        logger.error({ latencyMs }, 'Gemini API request timed out');
        throw new Error('AI service request timed out. Please try again.');
      }

      if (error instanceof Error) {
        logger.error({ errorMessage: error.message, latencyMs }, 'Unexpected error from AI service');
        throw error;
      }

      logger.error({ latencyMs }, 'Unknown error from AI service');
      throw new Error('AI service encountered an unexpected error.');
    }
  }

  /**
   * Convert user message + history into Gemini Content[] format.
   * The system instruction is handled separately via config.systemInstruction.
   */
  private buildContents(userMessage: string, history?: ChatMessage[]): Array<{ role: string; parts: Array<{ text: string }> }> {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (history && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.content }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    return contents;
  }

  /** Type guard for Gemini API errors. */
  private isApiError(error: unknown): error is { name: string; message: string; status: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof (error as Record<string, unknown>).status === 'number'
    );
  }
}
