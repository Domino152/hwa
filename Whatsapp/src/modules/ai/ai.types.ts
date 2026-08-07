/**
 * AI Module Types
 *
 * Defines all TypeScript interfaces for the Gemini AI integration.
 * The AI service is a pure LLM wrapper - it never accesses MongoDB or business logic.
 */

/** A single message in a conversation. */
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

/** The result returned by the AI service. */
export interface AIResponse {
  text: string;
  finishReason: string;
  tokenCount: number;
}

/** Configuration for the AI service. */
export interface AIServiceConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

/** Abstract interface for the AI service - enables DI and testing. */
export interface IAIService {
  generateResponse(userMessage: string, history?: ChatMessage[]): Promise<AIResponse>;
}

/** Default configuration values (excluding apiKey which must be provided). */
export const DEFAULT_AI_CONFIG: Omit<AIServiceConfig, 'apiKey'> = {
  model: 'gemini-2.5-flash',
  maxTokens: 2048,
  temperature: 0.7,
  timeoutMs: 30_000,
} as const;
