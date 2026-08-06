import { type IntentName, type ChatbotContext, type ChatbotResponse } from './intents.js';
import { classifyIntent } from './intentClassifier.js';
import { generateResponse } from './responseGenerator.js';
import { integration } from '../integration/index.js';
import logger from '../shared/utils/logger.js';

const chatbotLogger = logger.child({ module: 'chatbot' });

/**
 * ChatbotService is the public facade for the chatbot module.
 * It orchestrates text normalization → intent classification → response generation.
 *
 * User lookup: if a WhatsApp number is linked to a user account,
 * the chatbot identifies them automatically and gates personal-data intents.
 *
 * All data access goes through the Integration Layer — no direct model imports.
 */
export class ChatbotService {
  /**
   * Process a raw user message and return a classified response.
   */
  async processMessage(text: string, context: Omit<ChatbotContext, 'isAuthenticated' | 'user'>): Promise<ChatbotResponse> {
    const start = Date.now();

    const intent: IntentName = classifyIntent(text);

    const userData = await integration.findUserByPhone(context.phone);

    const fullContext: ChatbotContext = {
      phone: context.phone,
      isAuthenticated: !!userData,
      originalText: text,
      ...(userData
        ? {
            user: {
              id: userData.id,
              fullName: userData.fullName,
              role: userData.role,
              studentId: userData.studentId,
            },
          }
        : {}),
    };

    const response = await generateResponse(intent, fullContext);

    const latencyMs = Date.now() - start;

    chatbotLogger.info(
      { phone: context.phone, intent, isAuthenticated: fullContext.isAuthenticated, latencyMs },
      'Message classified and responded',
    );

    return { intent, response, originalText: text };
  }
}
