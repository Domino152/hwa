import { type IntentName, type ChatbotContext, type ChatbotResponse } from './intents.js';
import { classifyIntent } from './intentClassifier.js';
import { generateResponse } from './responseGenerator.js';
import logger from '../shared/utils/logger.js';

const chatbotLogger = logger.child({ module: 'chatbot' });

/**
 * ChatbotService is the public facade for the chatbot module.
 * It orchestrates text normalization → intent classification → response generation.
 *
 * All data returned is mock. To integrate with MongoDB later:
 * 1. Populate ChatbotContext with student data (studentId, attendance, fees, etc.)
 * 2. Modify responseGenerator to use context data instead of mock constants.
 * The processMessage signature and return type remain unchanged.
 */
export class ChatbotService {
  /**
   * Process a raw user message and return a classified response.
   */
  async processMessage(text: string, context: ChatbotContext): Promise<ChatbotResponse> {
    const start = Date.now();

    const intent: IntentName = classifyIntent(text);
    const response = generateResponse(intent, context);

    const latencyMs = Date.now() - start;

    chatbotLogger.info(
      { phone: context.phone, intent, latencyMs },
      'Message classified and responded',
    );

    return { intent, response, originalText: text };
  }
}
