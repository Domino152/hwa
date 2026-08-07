import type { ChatbotContext, IntentName } from './intents.js';
import { PRIVATE_INTENTS } from './intents.js';
import { classifyIntentNLP, type ClassificationResult } from './intentClassifier.js';
import { generateResponse } from './responseGenerator.js';
import { GeminiOrchestrator, type OrchestratorResult } from './ai/gemini-orchestrator.js';
import { ToolExecutor } from './tools/tool-executor.js';
import { integration } from '../integration/index.js';
import {
  addHistoryEntry,
  updateSessionIntent,
  getConversationHistory,
} from './sessionManager.js';
import { getSuggestedActions } from './interactive.js';
import { config } from '../config/index.js';
import { createChildLogger } from '../shared/utils/logger.js';

const routerLogger = createChildLogger({ module: 'message-router' });

const NLP_CONFIDENCE_THRESHOLD = 0.35;

export interface RouteResult {
  intent: IntentName;
  response: string;
  originalText: string;
  suggestedActions?: Array<{ id: string; text: string }>;
  routedVia: 'button' | 'nlp' | 'ai';
}

export class MessageRouter {
  private geminiOrchestrator: GeminiOrchestrator | null = null;
  private toolExecutor: ToolExecutor;

  constructor() {
    this.toolExecutor = new ToolExecutor(integration);
  }

  private getGeminiOrchestrator(): GeminiOrchestrator | null {
    if (this.geminiOrchestrator) return this.geminiOrchestrator;

    const apiKey = config.GEMINI_API_KEY ?? '';
    if (!apiKey) {
      routerLogger.warn('GEMINI_API_KEY not set, AI escalation disabled');
      return null;
    }

    this.geminiOrchestrator = new GeminiOrchestrator(apiKey, this.toolExecutor);
    return this.geminiOrchestrator;
  }

  async route(text: string, context: Omit<ChatbotContext, 'isAuthenticated' | 'user'>): Promise<RouteResult> {
    const start = Date.now();

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

    if (this.isButtonClick(text)) {
      return this.routeButtonClick(text, fullContext, start);
    }

    const classification = classifyIntentNLP(text);

    if (
      classification.confidence >= NLP_CONFIDENCE_THRESHOLD ||
      classification.intent === 'greeting' ||
      classification.intent === 'help' ||
      classification.intent === 'login'
    ) {
      if (classification.intent !== 'unknown') {
        return this.routeKnownIntent(classification, fullContext, start);
      }
    }

    return this.routeToAI(text, fullContext, start);
  }

  private isButtonClick(text: string): boolean {
    return text.startsWith('intent:');
  }

  private async routeButtonClick(
    text: string,
    context: ChatbotContext,
    start: number,
  ): Promise<RouteResult> {
    const intentName = text.replace('intent:', '') as IntentName;

    routerLogger.debug({ intentName }, 'Routing button click');

    const isPrivate = PRIVATE_INTENTS.includes(intentName);

    if (isPrivate && !context.isAuthenticated) {
      const { loginRequiredCard } = await import('./formatter.js');
      const response = loginRequiredCard(`${config.LOGIN_PORTAL_URL}?phone=${context.phone}`);

      return {
        intent: intentName,
        response,
        originalText: text,
        suggestedActions: getSuggestedActions(intentName, false),
        routedVia: 'button',
      };
    }

    try {
      const response = await generateResponse(intentName, context);

      updateSessionIntent(context.phone, intentName);
      addHistoryEntry(context.phone, { role: 'user', text, intent: intentName, timestamp: Date.now() });
      addHistoryEntry(context.phone, { role: 'bot', text: response.substring(0, 200), intent: intentName, timestamp: Date.now() });

      const latencyMs = Date.now() - start;
      routerLogger.info({ phone: context.phone, intent: intentName, routedVia: 'button', latencyMs }, 'Button click routed');

      return {
        intent: intentName,
        response,
        originalText: text,
        suggestedActions: getSuggestedActions(intentName, context.isAuthenticated),
        routedVia: 'button',
      };
    } catch (error) {
      routerLogger.error({ error, intentName }, 'Button click handling failed');
      return this.routeToAI(text, context, start);
    }
  }

  private async routeKnownIntent(
    classification: ClassificationResult,
    context: ChatbotContext,
    start: number,
  ): Promise<RouteResult> {
    const intent = classification.intent;

    routerLogger.debug({ intent, confidence: classification.confidence }, 'Routing known intent via NLP');

    try {
      const response = await generateResponse(intent, context, classification);

      updateSessionIntent(context.phone, intent);
      addHistoryEntry(context.phone, { role: 'user', text: context.originalText, intent, timestamp: Date.now() });
      addHistoryEntry(context.phone, { role: 'bot', text: response.substring(0, 200), intent, timestamp: Date.now() });

      const latencyMs = Date.now() - start;
      routerLogger.info(
        { phone: context.phone, intent, confidence: classification.confidence, routedVia: 'nlp', latencyMs },
        'NLP fast path routed',
      );

      return {
        intent,
        response,
        originalText: context.originalText,
        suggestedActions: getSuggestedActions(intent, context.isAuthenticated),
        routedVia: 'nlp',
      };
    } catch (error) {
      routerLogger.warn({ error, intent, confidence: classification.confidence }, 'NLP fast path failed, escalating to AI');
      return this.routeToAI(context.originalText, context, start);
    }
  }

  private async routeToAI(
    text: string,
    context: ChatbotContext,
    start: number,
  ): Promise<RouteResult> {
    const orchestrator = this.getGeminiOrchestrator();

    if (!orchestrator) {
      routerLogger.warn('Gemini not available, falling back to unknown intent');
      const { unknownIntentCard } = await import('./formatter.js');
      return {
        intent: 'unknown' as IntentName,
        response: unknownIntentCard(),
        originalText: text,
        suggestedActions: getSuggestedActions('unknown', context.isAuthenticated),
        routedVia: 'ai',
      };
    }

    routerLogger.debug({ phone: context.phone }, 'Escalating to Gemini AI');

    const history = getConversationHistory(context.phone, 10);
    const chatHistory = history.map((h) => ({
      role: h.role === 'user' ? ('user' as const) : ('model' as const),
      text: h.text,
    }));

    const geminiHistory = chatHistory.map((h) => ({
      role: h.role,
      content: h.text,
    }));

    try {
      const result: OrchestratorResult = await orchestrator.processMessage(text, geminiHistory, {
        userName: context.user?.fullName,
        role: context.user?.role,
        studentId: context.user?.studentId,
      });

      const intent = this.classifyAIIntent(result);

      addHistoryEntry(context.phone, { role: 'user', text, intent, timestamp: Date.now() });
      addHistoryEntry(context.phone, { role: 'bot', text: result.text.substring(0, 200), intent, timestamp: Date.now() });

      const latencyMs = Date.now() - start;
      routerLogger.info(
        {
          phone: context.phone,
          intent,
          routedVia: 'ai',
          toolCalls: result.toolCallsMade.length,
          tokenCount: result.tokenCount,
          latencyMs,
        },
        'AI escalation complete',
      );

      return {
        intent,
        response: result.text,
        originalText: text,
        suggestedActions: getSuggestedActions(intent, context.isAuthenticated),
        routedVia: 'ai',
      };
    } catch (error) {
      routerLogger.error({ error, phone: context.phone }, 'AI escalation failed');

      const { unknownIntentCard } = await import('./formatter.js');
      return {
        intent: 'unknown' as IntentName,
        response: unknownIntentCard(),
        originalText: text,
        suggestedActions: getSuggestedActions('unknown', context.isAuthenticated),
        routedVia: 'ai',
      };
    }
  }

  private classifyAIIntent(result: OrchestratorResult): IntentName {
    const toolNames = result.toolCallsMade.map((tc) => tc.name);

    if (toolNames.includes('get_attendance')) return 'attendance' as IntentName;
    if (toolNames.includes('get_fees')) return 'fees' as IntentName;
    if (toolNames.includes('get_schedule')) return 'schedule' as IntentName;
    if (toolNames.includes('get_results')) return 'results' as IntentName;
    if (toolNames.includes('get_profile')) return 'profile' as IntentName;
    if (toolNames.includes('get_public_information') || toolNames.includes('search_public_information')) {
      return 'public_information' as IntentName;
    }
    if (toolNames.includes('get_announcements')) return 'announcements' as IntentName;

    const text = result.text.toLowerCase();
    if (text.includes('attendance')) return 'attendance' as IntentName;
    if (text.includes('fee') || text.includes('payment')) return 'fees' as IntentName;
    if (text.includes('schedule') || text.includes('timetable') || text.includes('class')) return 'schedule' as IntentName;
    if (text.includes('result') || text.includes('grade') || text.includes('cgpa')) return 'results' as IntentName;
    if (text.includes('profile')) return 'profile' as IntentName;

    return 'public_information' as IntentName;
  }
}
