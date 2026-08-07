import { type IntentName, type ChatbotContext, type ChatbotResponse } from './intents.js';
import { classifyIntentNLP, type ClassificationResult } from './intentClassifier.js';
import { generateResponse } from './responseGenerator.js';
import { integration } from '../integration/index.js';
import { addHistoryEntry, updateSessionIntent } from './sessionManager.js';
import { getSuggestedActions } from './interactive.js';
import logger from '../shared/utils/logger.js';

const chatbotLogger = logger.child({ module: 'chatbot' });

/**
 * ChatbotService is the public facade for the chatbot module.
 * It orchestrates session management → NLP classification → response generation.
 *
 * Features:
 * - Session memory: greets users only once per session
 * - NLP intent recognition: understands natural language
 * - Conversation context: tracks history for follow-ups
 * - Rich responses: formatted cards with emojis
 * - Interactive actions: suggested quick-reply buttons
 */
export class ChatbotService {
  /**
   * Process a raw user message and return a classified, formatted response.
   */
  async processMessage(text: string, context: Omit<ChatbotContext, 'isAuthenticated' | 'user'>): Promise<ChatbotResponse> {
    const start = Date.now();

    // NLP classification
    const classification: ClassificationResult = classifyIntentNLP(text);
    const intent: IntentName = classification.intent;

    // Look up user
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

    // Generate rich response
    const response = await generateResponse(intent, fullContext, classification);

    // Update session state
    updateSessionIntent(context.phone, intent);
    addHistoryEntry(context.phone, {
      role: 'user',
      text,
      intent,
      timestamp: Date.now(),
    });
    addHistoryEntry(context.phone, {
      role: 'bot',
      text: response.substring(0, 200), // Store truncated for memory
      intent,
      timestamp: Date.now(),
    });

    // Get suggested actions for this intent
    const suggestedActions = getSuggestedActions(intent, fullContext.isAuthenticated);

    const latencyMs = Date.now() - start;

    chatbotLogger.info(
      {
        phone: context.phone,
        intent,
        confidence: classification.confidence,
        subject: classification.extractedSubject,
        date: classification.dateExpression,
        isAuthenticated: fullContext.isAuthenticated,
        latencyMs,
      },
      'Message processed with NLP',
    );

    return { intent, response, originalText: text, suggestedActions };
  }
}
