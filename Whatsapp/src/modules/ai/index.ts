import { GeminiAIService } from './ai.service.js';
import { config } from '../../config/index.js';
import type { IAIService } from './ai.types.js';

/**
 * Create and export the AI service instance.
 *
 * In test environments or when GEMINI_API_KEY is not set,
 * we return null so the app can still start without AI features.
 */
let _aiService: IAIService | null = null;
let _initialized = false;

export function getAIService(): IAIService | null {
  if (!_initialized) {
    _initialized = true;
    const apiKey = config.GEMINI_API_KEY ?? '';
    if (!apiKey) {
      return null;
    }
    try {
      _aiService = new GeminiAIService({ apiKey });
    } catch {
      return null;
    }
  }
  return _aiService;
}

export { GeminiAIService } from './ai.service.js';
export type { ChatMessage, AIResponse, AIServiceConfig, IAIService } from './ai.types.js';
export { DEFAULT_AI_CONFIG } from './ai.types.js';
export { SYSTEM_PROMPT, buildSystemPrompt } from './prompt.js';
export { createAIRoutes } from './ai.routes.js';
