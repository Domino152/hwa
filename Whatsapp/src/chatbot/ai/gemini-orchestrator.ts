import { GoogleGenAI, Type, type Schema } from '@google/genai';
import type { ChatMessage } from '../../modules/ai/ai.types.js';
import { IntentName } from '../intents.js';
import { createChildLogger } from '../../shared/utils/logger.js';

const orchLogger = createChildLogger({ module: 'gemini-classifier' });

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_MAX_OUTPUT_TOKENS = 256;
const DEFAULT_TEMPERATURE = 0.2;

/**
 * Fields that must never be trusted from the model.
 * The backend derives identity from the authenticated session — the model
 * is never permitted to override or fabricate who the user is.
 */
const FORBIDDEN_ENTITY_KEYS = new Set([
  'studentId',
  'student_id',
  'rollNumber',
  'roll_number',
  'name',
  'fullName',
  'phone',
  'phoneNumber',
  'id',
  'userId',
  'parentId',
]);

const KNOWN_INTENT_VALUES = Object.values(IntentName) as string[];

const classificationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      description:
        'The classified intent. Must be one of the known intent names, or "unknown" if the query does not match any supported intent.',
      enum: KNOWN_INTENT_VALUES,
    },
    entities: {
      type: Type.OBJECT,
      description:
        'Optional structured entities extracted from the message (e.g., subject, dateExpression, query). Empty object if none. NEVER include identity fields.',
      properties: {
        subject: {
          type: Type.STRING,
          description: 'Optional subject name (e.g., "DBMS", "Java", "Operating Systems").',
        },
        dateExpression: {
          type: Type.STRING,
          description: 'Optional natural-language date like "today", "tomorrow", "next monday".',
        },
        query: {
          type: Type.STRING,
          description: 'Optional search query for public information lookups.',
        },
        category: {
          type: Type.STRING,
          description: 'Optional public information category.',
        },
      },
    },
    requiresDatabase: {
      type: Type.BOOLEAN,
      description:
        'True if answering the intent requires database access (e.g., attendance, fees, results). False for general college help or greetings.',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score between 0 and 1. Use low values when uncertain.',
    },
  },
  required: ['intent', 'requiresDatabase', 'confidence'],
};

/**
 * Structured intent classification produced by the Gemini classifier.
 * The backend validates this, performs authorization, fetches data, and
 * formats the final response. The model has NO access to MongoDB.
 */
export interface GeminiClassification {
  intent: IntentName;
  entities: Record<string, string>;
  requiresDatabase: boolean;
  confidence: number;
  rawText?: string;
  tokenCount: number;
}

/**
 * Back-compat alias for the previous orchestrator result type.
 * Older consumers referenced `OrchestratorResult.text`; we expose the
 * same shape so internal callers keep compiling while the field now
 * carries the raw model JSON instead of a freeform answer.
 *
 * @deprecated Use `GeminiClassification` directly.
 */
export interface OrchestratorResult {
  intent: IntentName;
  entities: Record<string, string>;
  requiresDatabase: boolean;
  confidence: number;
  text: string;
  tokenCount: number;
  toolCallsMade: Array<{ name: string; args: Record<string, unknown> }>;
}

const CLASSIFICATION_PROMPT = `You are an intent classifier for the HITS (Hindustan Institute of Technology and Science) College WhatsApp Assistant.

Your ONLY job is to read the user's message and return a single JSON object describing the intent. You do NOT generate answers, do NOT call databases, and do NOT fabricate personal data.

## Output schema (strict JSON)
{
  "intent": "<IntentName>",
  "entities": { "subject"?: string, "dateExpression"?: string, "query"?: string, "category"?: string },
  "requiresDatabase": boolean,
  "confidence": number between 0 and 1
}

## Allowed intent values
${KNOWN_INTENT_VALUES.map((v) => `- ${v}`).join('\n')}

## Rules
- Pick the single best intent. If nothing matches, use "unknown".
- "requiresDatabase" is true only when answering needs personal/student records (attendance, fees, results, schedule, profile). False for greetings, generic help, public information, or non-database queries.
- confidence reflects how sure you are. Use values below 0.5 when the message is ambiguous or out-of-scope.
- Extract entities conservatively. Only include an entity if the user clearly stated it.
- NEVER include identity fields (studentId, name, phone, id) in entities. The backend derives identity from the authenticated session.
- For public information queries (admissions, departments, hostel, placements, etc.) use intent "public_information" and put the topic in entities.query or entities.category.
- Return ONLY the JSON object. No prose, no markdown, no code fences.`;

function isAiApiError(error: unknown): error is { status: number; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as Record<string, unknown>).status === 'number'
  );
}

function sanitizeEntities(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (FORBIDDEN_ENTITY_KEYS.has(key)) continue;
    if (typeof value === 'string' && value.trim().length > 0) {
      out[key] = value.trim();
    }
  }
  return out;
}

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function parseIntent(value: unknown): IntentName {
  if (typeof value !== 'string') return IntentName.Unknown;
  const match = KNOWN_INTENT_VALUES.find((v) => v === value);
  return (match as IntentName) ?? IntentName.Unknown;
}

function toUnknownClassification(reason: string, rawText: string, tokenCount: number): GeminiClassification {
  orchLogger.debug({ reason }, 'Classifier falling back to unknown intent');
  return {
    intent: IntentName.Unknown,
    entities: {},
    requiresDatabase: false,
    confidence: 0,
    rawText,
    tokenCount,
  };
}

/**
 * Gemini-based NLU classifier.
 *
 * Responsibilities:
 * - Single round-trip call to Gemini for intent classification.
 * - Returns a structured `GeminiClassification` (no tools, no freeform text).
 * - Sanitizes entities to remove identity fields the model must never set.
 * - Gracefully degrades to "unknown" on parse failure, low confidence, or API error.
 *
 * Constraints:
 * - NEVER accesses MongoDB or any backend data.
 * - NEVER generates the final user-facing response.
 */
export class GeminiOrchestrator {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model?: string) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required to initialize GeminiOrchestrator');
    }
    this.client = new GoogleGenAI({ apiKey });
    this.model = model ?? DEFAULT_MODEL;
  }

  async processMessage(
    userMessage: string,
    history?: ChatMessage[],
    context?: { userName?: string; role?: string },
  ): Promise<GeminiClassification> {
    const start = Date.now();
    const contents = this.buildContents(userMessage, history);

    orchLogger.debug(
      { messageLength: userMessage.length, historyLength: history?.length ?? 0, model: this.model },
      'Classifying intent via Gemini',
    );

    let responseText = '';
    let tokenCount = 0;

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: this.buildSystemInstruction(context),
          maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
          temperature: DEFAULT_TEMPERATURE,
          responseMimeType: 'application/json',
          responseSchema: classificationSchema,
        },
      });

      responseText = response.text ?? '';
      tokenCount = response.usageMetadata?.totalTokenCount ?? 0;

      let parsed: unknown;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        orchLogger.warn(
          { parseErr, responseTextPreview: responseText.slice(0, 200) },
          'Classifier returned non-JSON; falling back to unknown',
        );
        return toUnknownClassification('parse_error', responseText, tokenCount);
      }

      const obj = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
      const intent = parseIntent(obj.intent);
      const entities = sanitizeEntities(obj.entities);
      const requiresDatabase = obj.requiresDatabase === true;
      const confidence = clampConfidence(obj.confidence);

      const classification: GeminiClassification = {
        intent,
        entities,
        requiresDatabase,
        confidence,
        rawText: responseText,
        tokenCount,
      };

      orchLogger.info(
        {
          intent,
          confidence,
          requiresDatabase,
          entityKeys: Object.keys(entities),
          tokenCount,
          latencyMs: Date.now() - start,
        },
        'Intent classified',
      );

      return classification;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isAiApiError(error)) {
        orchLogger.error(
          { status: error.status, message, latencyMs: Date.now() - start },
          'Gemini API error during classification',
        );
      } else {
        orchLogger.error(
          { message, latencyMs: Date.now() - start },
          'Unexpected classifier error',
        );
      }
      return toUnknownClassification('api_error', responseText, tokenCount);
    }
  }

  private buildSystemInstruction(context?: { userName?: string; role?: string }): string {
    let prompt = CLASSIFICATION_PROMPT;
    if (context?.userName) {
      prompt += `\n\nThe authenticated user's name is ${context.userName}. Use this only for context. Never include it in entities.`;
    }
    if (context?.role) {
      prompt += `\n\nThe authenticated user is a ${context.role}.`;
    }
    return prompt;
  }

  private buildContents(userMessage: string, history?: ChatMessage[]): Array<{
    role: string;
    parts: Array<{ text: string }>;
  }> {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (history && history.length > 0) {
      for (const msg of history) {
        contents.push({ role: msg.role, parts: [{ text: msg.content }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: userMessage }] });
    return contents;
  }
}
