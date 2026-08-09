import type { ChatbotContext } from './intents.js';
import { IntentName, PRIVATE_INTENTS } from './intents.js';
import { classifyIntentNLP, type ClassificationResult } from './intentClassifier.js';
import { generateResponse, getLoginUrl } from './responseGenerator.js';
import {
  GeminiOrchestrator,
  type GeminiClassification,
} from './ai/gemini-orchestrator.js';
import { ToolExecutor, type ToolName } from './tools/tool-executor.js';
import { integration } from '../integration/index.js';
import {
  addHistoryEntry,
  updateSessionIntent,
  getConversationHistory,
} from './sessionManager.js';
import { getSuggestedActions } from './interactive.js';
import { config } from '../config/index.js';
import {
  attendanceCard,
  feesCard,
  scheduleCard,
  resultsCard,
  profileCard,
  announcementsCard,
  sectionHeader,
  card,
  bulletItem,
  loginRequiredCard,
  unknownIntentCard,
} from './formatter.js';
import { createChildLogger } from '../shared/utils/logger.js';

const routerLogger = createChildLogger({ module: 'message-router' });

const NLP_CONFIDENCE_THRESHOLD = 0.35;
const AI_CONFIDENCE_THRESHOLD = 0.4;

const INTENT_TO_TOOL: Partial<Record<IntentName, ToolName>> = {
  [IntentName.Attendance]: 'get_attendance',
  [IntentName.Fees]: 'get_fees',
  [IntentName.Schedule]: 'get_schedule',
  [IntentName.Results]: 'get_results',
  [IntentName.Profile]: 'get_profile',
  [IntentName.Announcements]: 'get_announcements',
};

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

    this.geminiOrchestrator = new GeminiOrchestrator(apiKey, config.GEMINI_MODEL);
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

    routerLogger.debug(
      { phone: context.phone, textLength: text.length, isAuthenticated: fullContext.isAuthenticated },
      'MESSAGE_RECEIVED',
    );

    routerLogger.info(
      { phone: context.phone, isAuthenticated: fullContext.isAuthenticated },
      'auth_check',
    );

    if (this.isButtonClick(text)) {
      routerLogger.info(
        { phone: context.phone, text: text.substring(0, 50) },
        'gemini_skipped_reason:deterministic_interactive_action',
      );
      return this.routeButtonClick(text, fullContext, start);
    }

    const classification = classifyIntentNLP(text);
    routerLogger.debug(
      { phone: context.phone, intent: classification.intent, confidence: classification.confidence },
      'deterministic_intent',
    );

    if (
      classification.confidence >= NLP_CONFIDENCE_THRESHOLD ||
      classification.intent === 'greeting' ||
      classification.intent === 'help' ||
      classification.intent === 'login'
    ) {
      if (classification.intent !== 'unknown') {
        routerLogger.info(
          { phone: context.phone, intent: classification.intent, confidence: classification.confidence },
          'gemini_skipped_reason:deterministic_nlp_match',
        );
        return this.routeKnownIntent(classification, fullContext, start);
      }
    }

    routerLogger.debug(
      { phone: context.phone, nlpIntent: classification.intent, nlpConfidence: classification.confidence },
      'ai_fallback: true — escalating to Gemini',
    );
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

    routerLogger.info(
      { phone: context.phone, action: intentName },
      'interactive_action_received',
    );

    const isPrivate = PRIVATE_INTENTS.includes(intentName);

    if (isPrivate && !context.isAuthenticated) {
      const response = loginRequiredCard(await getLoginUrl(context.phone));

      routerLogger.info(
        { phone: context.phone, action: intentName, reason: 'unauthenticated' },
        'interactive_action_blocked',
      );

      return {
        intent: intentName,
        response,
        originalText: text,
        suggestedActions: getSuggestedActions(intentName, false),
        routedVia: 'button',
      };
    }

    try {
      const response = await this.executeIntent(intentName, context);

      updateSessionIntent(context.phone, intentName);
      addHistoryEntry(context.phone, { role: 'user', text, intent: intentName, timestamp: Date.now() });
      addHistoryEntry(context.phone, { role: 'bot', text: response.substring(0, 200), intent: intentName, timestamp: Date.now() });

      const latencyMs = Date.now() - start;
      routerLogger.info(
        { phone: context.phone, intent: intentName, routedVia: 'button', latencyMs },
        'interactive_action_completed',
      );

      return {
        intent: intentName,
        response,
        originalText: text,
        suggestedActions: getSuggestedActions(intentName, context.isAuthenticated),
        routedVia: 'button',
      };
    } catch (error) {
      routerLogger.error({ error, intentName }, 'interactive_action_failed');
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
      const response = await this.executeIntent(intent, context, classification);

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
      routerLogger.warn({ phone: context.phone }, 'gemini_request_skipped: no API key — falling back to unknown');
      return this.fallbackAI(text, context, start, 'no_api_key');
    }

    routerLogger.debug(
      {
        phone: context.phone,
        model: config.GEMINI_MODEL,
        apiKeySet: !!config.GEMINI_API_KEY,
      },
      'gemini_request_started',
    );

    const history = getConversationHistory(context.phone, 10);
    const geminiHistory = history.map((h) => ({
      role: h.role === 'user' ? ('user' as const) : ('model' as const),
      content: h.text,
    }));

    let classification: GeminiClassification;
    try {
      classification = await orchestrator.processMessage(text, geminiHistory, {
        userName: context.user?.fullName,
        role: context.user?.role,
      });
    } catch (error) {
      routerLogger.error({ error, phone: context.phone }, 'gemini_request_failed');
      return this.fallbackAI(text, context, start, 'api_error');
    }

    routerLogger.debug(
      {
        phone: context.phone,
        gemini_intent: classification.intent,
        gemini_confidence: classification.confidence,
        gemini_requiresDatabase: classification.requiresDatabase,
        gemini_entityKeys: Object.keys(classification.entities),
        tokenCount: classification.tokenCount,
      },
      'gemini_response_received',
    );

    const intent = classification.intent;

    // Identity-safety: backend ignores model-provided identity fields.
    // Sanitization happens in the orchestrator (entities) and the router
    // never reads identity from classification — only from context.user.

    if (intent === IntentName.Unknown) {
      return this.fallbackAI(text, context, start, 'unknown_intent', classification);
    }

    if (classification.confidence < AI_CONFIDENCE_THRESHOLD) {
      routerLogger.debug(
        { intent, confidence: classification.confidence },
        'AI confidence below threshold; falling back to unknown',
      );
      return this.fallbackAI(text, context, start, 'low_confidence', classification);
    }

    if (PRIVATE_INTENTS.includes(intent) && !context.isAuthenticated) {
      const response = loginRequiredCard(await getLoginUrl(context.phone));
      this.recordAIExchange(context, text, intent, response);
      return {
        intent,
        response,
        originalText: text,
        suggestedActions: getSuggestedActions(intent, false),
        routedVia: 'ai',
      };
    }

    try {
      const response = await this.executeIntent(intent, context, classification);
      this.recordAIExchange(context, text, intent, response);

      routerLogger.debug(
        {
          phone: context.phone,
          handler: intent,
          responseLength: response.length,
        },
        'intent_handled',
      );

      const latencyMs = Date.now() - start;
      routerLogger.info(
        {
          phone: context.phone,
          intent,
          confidence: classification.confidence,
          routedVia: 'ai',
          tokenCount: classification.tokenCount,
          latencyMs,
        },
        'AI classification routed',
      );

      return {
        intent,
        response,
        originalText: text,
        suggestedActions: getSuggestedActions(intent, context.isAuthenticated),
        routedVia: 'ai',
      };
    } catch (error) {
      routerLogger.error({ error, phone: context.phone, intent }, 'AI-routed intent execution failed');
      return this.fallbackAI(text, context, start, 'execution_error', classification);
    }
  }

  private fallbackAI(
    text: string,
    context: ChatbotContext,
    start: number,
    reason: string,
    classification?: GeminiClassification,
  ): RouteResult {
    const response = unknownIntentCard();
    const intent = IntentName.Unknown;
    this.recordAIExchange(context, text, intent, response);

    routerLogger.info(
      {
        phone: context.phone,
        reason,
        confidence: classification?.confidence,
        routedVia: 'ai',
        latencyMs: Date.now() - start,
      },
      'AI escalation fell back to unknown',
    );

    return {
      intent,
      response,
      originalText: text,
      suggestedActions: getSuggestedActions(intent, context.isAuthenticated),
      routedVia: 'ai',
    };
  }

  private recordAIExchange(
    context: ChatbotContext,
    text: string,
    intent: IntentName,
    response: string,
  ): void {
    updateSessionIntent(context.phone, intent);
    addHistoryEntry(context.phone, {
      role: 'user',
      text,
      intent,
      timestamp: Date.now(),
    });
    addHistoryEntry(context.phone, {
      role: 'bot',
      text: response.substring(0, 200),
      intent,
      timestamp: Date.now(),
    });
  }

  /**
   * Execute an intent end-to-end on the backend.
   *
   * Uses the existing ToolExecutor as the backend executor for intents
   * that map to a data tool. For intents without a tool (e.g., syllabus,
   * login, help) it falls back to the deterministic response generator.
   *
   * Identity is ALWAYS read from the authenticated session, never from
   * classification entities.
   */
  private async executeIntent(
    intent: IntentName,
    context: ChatbotContext,
    classification?: GeminiClassification | ClassificationResult,
  ): Promise<string> {
    const toolName = INTENT_TO_TOOL[intent];

    if (!toolName) {
      // Fall back to the deterministic formatter for tool-less intents.
      return this.executeViaResponseGenerator(intent, context, classification);
    }

    if (PRIVATE_INTENTS.includes(intent) && !context.user?.studentId) {
      return loginRequiredCard(await getLoginUrl(context.phone));
    }

    const args = this.buildToolArgs(intent, context, classification);
    const result = await this.toolExecutor.execute(toolName, args);

    if (!result.success) {
      routerLogger.warn({ intent, error: result.error }, 'Tool execution returned error');
      return card('⚠️ Error', ['We could not fetch your data right now. Please try again later.']);
    }

    const formatted = this.formatToolResult(intent, result.data);
    if (!formatted) {
      return this.executeViaResponseGenerator(intent, context, classification);
    }
    return formatted;
  }

  private async executeViaResponseGenerator(
    intent: IntentName,
    context: ChatbotContext,
    classification?: GeminiClassification | ClassificationResult,
  ): Promise<string> {
    if (classification && 'entities' in classification) {
      return generateResponse(intent, context, this.toNLPClassification(classification));
    }
    return generateResponse(intent, context);
  }

  private buildToolArgs(
    intent: IntentName,
    context: ChatbotContext,
    classification?: GeminiClassification | ClassificationResult,
  ): Record<string, unknown> {
    const args: Record<string, unknown> = {};

    if (intent === IntentName.PublicInformation) {
      const entities = this.getEntities(classification);
      args.category = entities.category ?? 'about_hits';
      if (entities.query) args.query = entities.query;
      return args;
    }

    if (intent === IntentName.Announcements) {
      const entities = this.getEntities(classification);
      if (entities.category) args.category = entities.category;
      return args;
    }

    // Private intents: identity is always from the authenticated session.
    if (context.user?.studentId) {
      args.studentId = context.user.studentId;
    }

    const entities = this.getEntities(classification);
    if (entities.subject) args.subject = entities.subject;
    if (entities.dateExpression) args.dateExpression = entities.dateExpression;

    return args;
  }

  private getEntities(
    classification?: GeminiClassification | ClassificationResult,
  ): Record<string, string> {
    if (!classification) return {};
    if ('entities' in classification && classification.entities) {
      return { ...classification.entities };
    }
    const out: Record<string, string> = {};
    const c = classification as ClassificationResult;
    if (c.dateExpression) out.dateExpression = c.dateExpression;
    if (c.extractedSubject) out.subject = c.extractedSubject;
    return out;
  }

  private toNLPClassification(classification: GeminiClassification): ClassificationResult {
    return {
      intent: classification.intent,
      confidence: classification.confidence,
      dateExpression: classification.entities.dateExpression ?? null,
      extractedSubject: classification.entities.subject ?? null,
    };
  }

  private formatToolResult(
    intent: IntentName,
    data: unknown,
  ): string | null {
    if (!data || typeof data !== 'object') return null;
    const d = data as Record<string, unknown>;

    switch (intent) {
      case IntentName.Attendance:
        return this.formatAttendance(d);
      case IntentName.Fees:
        return this.formatFees(d);
      case IntentName.Schedule:
        return this.formatSchedule(d);
      case IntentName.Results:
        return this.formatResults(d);
      case IntentName.Profile:
        return this.formatProfile(d);
      case IntentName.Announcements:
        return this.formatAnnouncements(d);
      case IntentName.PublicInformation:
        return this.formatPublicInformation(d);
      default:
        return null;
    }
  }

  private formatAttendance(d: Record<string, unknown>): string | null {
    if (d.hasData === false) {
      return card('📊 Attendance', ['No attendance records found.', '', 'Please contact your administrator.']);
    }
    const overall = typeof d.overallPercentage === 'number' ? d.overallPercentage : 0;
    const subjects = Array.isArray(d.subjects) ? (d.subjects as Array<{
      subject: string;
      percentage: number;
      attendedClasses: number;
      totalClasses: number;
    }>) : [];
    return attendanceCard(overall, subjects);
  }

  private formatFees(d: Record<string, unknown>): string | null {
    if (d.hasData === false) {
      return card('💰 Fees', ['No fee records found.', '', 'Please contact your administrator.']);
    }
    const dueDate = typeof d.dueDate === 'string' ? new Date(d.dueDate) : new Date();
    return feesCard({
      totalFee: Number(d.totalFee ?? 0),
      paidAmount: Number(d.paidAmount ?? 0),
      remainingAmount: Number(d.remainingAmount ?? 0),
      dueDate,
      status: String(d.status ?? 'pending'),
    });
  }

  private formatSchedule(d: Record<string, unknown>): string | null {
    if (d.hasData === false) {
      return card('📅 Schedule', ['No schedule found for the requested day.']);
    }
    const entries = Array.isArray(d.entries) ? (d.entries as Array<{
      timeSlot: string;
      subject: string;
      room: string;
      type: string;
    }>) : [];
    const dayLabel = String(d.dateLabel ?? 'Today');
    const dayOfWeek = String(d.dayOfWeek ?? '');
    return scheduleCard(dayOfWeek ? `${dayLabel} (${dayOfWeek})` : dayLabel, entries);
  }

  private formatResults(d: Record<string, unknown>): string | null {
    if (d.hasData === false) {
      return card('📝 Results', ['No results found.', '', 'Please contact your administrator.']);
    }
    const results = Array.isArray(d.subjects) ? (d.subjects as Array<{
      subject: string;
      grade: string;
      marksObtained: number;
      totalMarks: number;
    }>) : [];
    const cgpa = typeof d.cgpa === 'number' ? d.cgpa : 0;
    return resultsCard(results, cgpa);
  }

  private formatProfile(d: Record<string, unknown>): string | null {
    if (d.hasData === false) {
      return card('👤 Profile', ['Profile not found.', '', 'Please contact your administrator.']);
    }
    const student = (d.student ?? {}) as Record<string, unknown>;
    return profileCard({
      fullName: String(student.fullName ?? 'Unknown'),
      studentId: String(student.studentId ?? 'Unknown'),
      department: String(student.department ?? 'Unknown'),
      year: Number(student.year ?? 0),
      section: String(student.section ?? 'Unknown'),
    });
  }

  private formatAnnouncements(d: Record<string, unknown>): string | null {
    const entries = Array.isArray(d.entries) ? (d.entries as Array<{
      title: string;
      content: string;
      updatedAt?: string;
    }>) : [];
    return announcementsCard(
      entries.map((e) => ({
        title: e.title,
        content: e.content,
        priority: 'normal' as const,
        publishedAt: e.updatedAt ? new Date(e.updatedAt) : new Date(),
      })),
    );
  }

  private formatPublicInformation(d: Record<string, unknown>): string | null {
    if (d.hasData === false) {
      return card('🔍 Search', ['No information found for your query.']);
    }
    const category = String(d.category ?? 'Information').replace(/_/g, ' ');
    const entries = Array.isArray(d.entries) ? (d.entries as Array<{
      title: string;
      content: string;
    }>) : [];
    if (entries.length === 0) return null;
    if (entries.length === 1) {
      const e = entries[0]!;
      return [sectionHeader(e.title, 'ℹ️'), '', e.content].join('\n');
    }
    const lines = entries.map((e) => `${bulletItem(`${e.title}: ${e.content.substring(0, 150)}`)}`);
    return [sectionHeader(category, 'ℹ️'), '', ...lines].join('\n');
  }
}
