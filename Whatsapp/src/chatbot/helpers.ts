const PUNCTUATION_REGEX = /[^\w\s]/g;
const MULTIPLE_SPACES_REGEX = /\s+/g;

/**
 * Normalize user input for intent classification.
 * - Converts to lowercase
 * - Strips punctuation (replaces with space)
 * - Collapses multiple whitespace to a single space
 * - Trims leading/trailing whitespace
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(PUNCTUATION_REGEX, ' ')
    .replace(MULTIPLE_SPACES_REGEX, ' ')
    .trim();
}
