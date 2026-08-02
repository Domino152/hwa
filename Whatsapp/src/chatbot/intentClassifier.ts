import { IntentName, INTENT_DEFINITIONS } from './intents.js';
import { normalizeText } from './helpers.js';

/**
 * Classify the user's message into an intent.
 *
 * Uses priority-weighted substring matching. The order of
 * INTENT_DEFINITIONS determines priority: domain-intents
 * (attendance, fees, schedule, results, syllabus) are checked
 * before greeting/help.
 *
 * @param text Raw user message
 * @returns Classified intent name
 */
export function classifyIntent(text: string): IntentName {
  const normalized = normalizeText(text);

  for (const intent of INTENT_DEFINITIONS) {
    for (const pattern of intent.patterns) {
      if (normalized.includes(pattern)) {
        return intent.name;
      }
    }
  }

  return IntentName.Unknown;
}
