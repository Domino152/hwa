import { ChatbotService } from './chatbot.service.js';

export const chatbotService = new ChatbotService();

export { ChatbotService } from './chatbot.service.js';
export type { ChatbotContext, ChatbotResponse } from './intents.js';
export { IntentName } from './intents.js';
export { classifyIntent } from './intentClassifier.js';
export { generateResponse } from './responseGenerator.js';
export { normalizeText } from './helpers.js';
