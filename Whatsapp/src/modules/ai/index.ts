import { GeminiAIService } from './ai.service.js';
import { config } from '../../config/index.js';
import type { IAIService } from './ai.types.js';

/**
 * Create and export the AI service instance.
 *
 * In test environments, GEMINI_API_KEY may not be set.
 * We export a lazy getter so the module can still be imported without crashing.
 */
let _aiService: IAIService | null = null;

export function getAIService(): IAIService {
  if (!_aiService) {
    const apiKey = config.GEMINI_API_KEY ?? '';
    _aiService = new GeminiAIService({ apiKey });
  }
  return _aiService;
}

export { GeminiAIService } from './ai.service.js';
export type { ChatMessage, AIResponse, AIServiceConfig, IAIService } from './ai.types.js';
export { DEFAULT_AI_CONFIG } from './ai.types.js';
export { SYSTEM_PROMPT, buildSystemPrompt } from './prompt.js';
export { createAIRoutes } from './ai.routes.js';
