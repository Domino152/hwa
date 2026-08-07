import type { ChatbotContext, ChatbotResponse } from './intents.js';
import { MessageRouter, type RouteResult } from './router.js';
import logger from '../shared/utils/logger.js';

const chatbotLogger = logger.child({ module: 'chatbot' });

/**
 * ChatbotService is the public facade for the chatbot module.
 * It delegates to MessageRouter which handles the hybrid AI architecture:
 *
 * 1. Button clicks → Direct tool execution via backend services
 * 2. Known intents (NLP fast path) → Direct response generation
 * 3. Unknown/low-confidence → Gemini AI escalation with tool calling
 *
 * Features:
 * - Session memory with MongoDB persistence
 * - NLP intent recognition with confidence threshold
 * - Gemini 2.5 Flash for complex/unrecognized queries
 * - Tool-calling loop for real data retrieval
 * - Conversation history for follow-ups
 * - Date-aware reasoning
 * - Multilingual support
 * - Rich formatted WhatsApp responses
 */
export class ChatbotService {
  private readonly router: MessageRouter;

  constructor() {
    this.router = new MessageRouter();
  }

  /**
   * Process a raw user message and return a classified, formatted response.
   * Routes through: Button Click → NLP Fast Path → AI Escalation
   */
  async processMessage(text: string, context: Omit<ChatbotContext, 'isAuthenticated' | 'user'>): Promise<ChatbotResponse> {
    const result: RouteResult = await this.router.route(text, context);

    chatbotLogger.info(
      {
        phone: context.phone,
        intent: result.intent,
        routedVia: result.routedVia,
        responseLength: result.response.length,
      },
      'Message processed',
    );

    return {
      intent: result.intent,
      response: result.response,
      originalText: result.originalText,
      suggestedActions: result.suggestedActions,
    };
  }
}
