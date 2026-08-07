import { ChatbotService } from './chatbot.service.js';

export const chatbotService = new ChatbotService();

export { ChatbotService } from './chatbot.service.js';
export type { ChatbotContext, ChatbotResponse, AuthenticatedUserInfo } from './intents.js';
export { IntentName, PRIVATE_INTENTS } from './intents.js';
export { classifyIntent, classifyIntentNLP, type ClassificationResult } from './intentClassifier.js';
export { generateResponse } from './responseGenerator.js';
export { normalizeText } from './helpers.js';
export { parseNaturalDate, extractDateExpression, type ParsedDate } from './dateParser.js';
export { getSession, markGreetingSent, type ChatSession } from './sessionManager.js';
export {
  sendListMessage,
  sendButtonsMessage,
  sendSuggestedActions,
  buildMainMenuList,
  getSuggestedActions,
  type ButtonOption,
  type ListSection,
} from './interactive.js';
export {
  attendanceCard,
  feesCard,
  scheduleCard,
  resultsCard,
  profileCard,
  announcementsCard,
  greetingCard,
  helpCard,
  loginRequiredCard,
  unknownIntentCard,
  sectionHeader,
  card,
  progressBar,
} from './formatter.js';
