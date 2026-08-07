import { GoogleGenAI, FunctionCallingConfigMode } from '@google/genai';
import type { Content, Part } from '@google/genai';
import type { ChatMessage } from '../../modules/ai/ai.types.js';
import { getToolDeclarations } from '../tools/tool-definitions.js';
import { ToolExecutor, type ToolName } from '../tools/tool-executor.js';
import { AI_CHATBOT_SYSTEM_PROMPT } from './ai-chatbot-prompt.js';
import { createChildLogger } from '../../shared/utils/logger.js';

const orchLogger = createChildLogger({ module: 'gemini-orchestrator' });

const MAX_TOOL_ROUNDS = 5;
const DEFAULT_CONFIG = {
  model: 'gemini-2.5-flash',
  maxOutputTokens: 2048,
  temperature: 0.7,
};

export interface OrchestratorResult {
  text: string;
  toolCallsMade: Array<{ name: string; args: Record<string, unknown> }>;
  tokenCount: number;
}

export class GeminiOrchestrator {
  private readonly client: GoogleGenAI;
  private readonly toolExecutor: ToolExecutor;
  private readonly model: string;

  constructor(apiKey: string, toolExecutor: ToolExecutor, model?: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.toolExecutor = toolExecutor;
    this.model = model ?? DEFAULT_CONFIG.model;
  }

  async processMessage(
    userMessage: string,
    history: ChatMessage[],
    context?: { userName?: string; role?: string; studentId?: string },
  ): Promise<OrchestratorResult> {
    const start = Date.now();
    const tools = getToolDeclarations();
    const toolCallsMade: Array<{ name: string; args: Record<string, unknown> }> = [];

    const systemInstruction = this.buildSystemInstruction(context);

    const contents = this.buildContents(userMessage, history);

    orchLogger.debug(
      { messageLength: userMessage.length, historyLength: history.length, toolCount: tools.length },
      'Starting Gemini orchestration',
    );

    let finalText = '';

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction,
          maxOutputTokens: DEFAULT_CONFIG.maxOutputTokens,
          temperature: DEFAULT_CONFIG.temperature,
          tools: [{ functionDeclarations: tools }],
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
        },
      });

      const candidate = response.candidates?.[0];
      const parts = (candidate?.content?.parts ?? []) as Part[];

      const functionCalls = parts.filter(
        (p): p is Part & { functionCall: NonNullable<Part['functionCall']> } =>
          !!p.functionCall,
      );

      if (functionCalls.length === 0) {
        const textParts = parts.filter((p) => !!p.text);
        finalText = textParts.map((p) => p.text).join('');

        orchLogger.info(
          {
            rounds: round + 1,
            toolCalls: toolCallsMade.length,
            tokenCount: response.usageMetadata?.totalTokenCount ?? 0,
            latencyMs: Date.now() - start,
          },
          'Gemini orchestration complete (no more tool calls)',
        );

        return {
          text: finalText,
          toolCallsMade,
          tokenCount: response.usageMetadata?.totalTokenCount ?? 0,
        };
      }

      const modelParts: Part[] = functionCalls.map((fc) => ({
        functionCall: fc.functionCall,
      }));

      contents.push({ role: 'model', parts: modelParts });

      const functionResponseParts: Part[] = [];

      for (const fc of functionCalls) {
        const toolName = fc.functionCall.name as ToolName;
        const toolArgs = (fc.functionCall.args ?? {}) as Record<string, unknown>;

        toolCallsMade.push({ name: toolName, args: toolArgs });

        orchLogger.debug({ toolName, args: toolArgs, round }, 'Executing tool via Gemini');

        const result = await this.toolExecutor.execute(toolName, toolArgs);

        functionResponseParts.push({
          functionResponse: {
            name: toolName,
            response: result as unknown as Record<string, unknown>,
          },
        });
      }

      contents.push({ role: 'user', parts: functionResponseParts });
    }

    orchLogger.warn(
      { rounds: MAX_TOOL_ROUNDS, toolCalls: toolCallsMade.length },
      'Gemini orchestration hit max tool rounds',
    );

    return {
      text: finalText || 'I apologize, but I needed more steps to process your request. Please try rephrasing your question.',
      toolCallsMade,
      tokenCount: 0,
    };
  }

  private buildSystemInstruction(context?: { userName?: string; role?: string; studentId?: string }): string {
    let prompt = AI_CHATBOT_SYSTEM_PROMPT;

    if (context?.userName) {
      prompt += `\n\nThe user's name is ${context.userName}. Address them by name when appropriate.`;
    }

    if (context?.role) {
      prompt += `\n\nThe user is a ${context.role}. Tailor your responses accordingly.`;
    }

    if (context?.studentId) {
      prompt += `\n\nThe user's student ID is ${context.studentId}. Use this when calling tools that require a studentId.`;
    }

    return prompt;
  }

  private buildContents(
    userMessage: string,
    history: ChatMessage[],
  ): Content[] {
    const contents: Content[] = [];

    for (const msg of history) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    return contents;
  }
}
