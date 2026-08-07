import type { Request, Response } from 'express';
import type { IAIService } from './ai.types.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/errors.js';
import { chatSchema } from './ai.schemas.js';

/**
 * AIController handles HTTP requests for the AI module.
 *
 * Uses arrow-function class fields to preserve `this` binding
 * (consistent with WhatsAppController pattern).
 */
export class AIController {
  constructor(private readonly aiService: IAIService) {}

  chat = async (req: Request, res: Response): Promise<void> => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', parsed.error.format());
    }

    const { message, history } = parsed.data;

    const result = await this.aiService.generateResponse(message, history);

    sendSuccess(res, {
      text: result.text,
      finishReason: result.finishReason,
      tokenCount: result.tokenCount,
    });
  };
}
