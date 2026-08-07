import { describe, it, expect } from 'vitest';
import { parseNaturalDate, extractDateExpression } from '../../src/chatbot/dateParser.js';

describe('Date Parser', () => {
  const referenceDate = new Date('2026-08-07T10:00:00'); // Thursday

  describe('parseNaturalDate', () => {
    it('parses "today"', () => {
      const result = parseNaturalDate('What is my schedule today?', referenceDate);
      expect(result.label).toBe('Today');
      expect(result.isRange).toBe(false);
      expect(result.date.toDateString()).toBe(referenceDate.toDateString());
    });

    it('parses "tomorrow"', () => {
      const result = parseNaturalDate('What about tomorrow?', referenceDate);
      expect(result.label).toBe('Tomorrow');
      expect(result.isRange).toBe(false);
      const expected = new Date(referenceDate);
      expected.setDate(expected.getDate() + 1);
      expect(result.date.toDateString()).toBe(expected.toDateString());
    });

    it('parses "yesterday"', () => {
      const result = parseNaturalDate('yesterday', referenceDate);
      expect(result.label).toBe('Yesterday');
      expect(result.isRange).toBe(false);
    });

    it('parses "this week"', () => {
      const result = parseNaturalDate('What is this week schedule?', referenceDate);
      expect(result.label).toBe('This Week');
      expect(result.isRange).toBe(true);
      expect(result.endDate).toBeDefined();
    });

    it('parses "next week"', () => {
      const result = parseNaturalDate('next week', referenceDate);
      expect(result.label).toBe('Next Week');
      expect(result.isRange).toBe(true);
    });

    it('parses "next monday"', () => {
      const result = parseNaturalDate('What about next monday?', referenceDate);
      expect(result.label).toBe('Next Monday');
      expect(result.isRange).toBe(false);
      expect(result.date.getDay()).toBe(1); // Monday
    });

    it('parses "on friday"', () => {
      const result = parseNaturalDate('on friday', referenceDate);
      expect(result.label.toLowerCase()).toBe('friday');
      expect(result.date.getDay()).toBe(5); // Friday
    });

    it('parses month names', () => {
      const result = parseNaturalDate('in january', referenceDate);
      expect(result.label.toLowerCase()).toBe('january');
      expect(result.date.getMonth()).toBe(0); // January
    });

    it('parses "this semester"', () => {
      const result = parseNaturalDate('this semester', referenceDate);
      expect(result.label).toContain('Semester');
    });

    it('falls back to today for unrecognized text', () => {
      const result = parseNaturalDate('random text', referenceDate);
      expect(result.label).toBe('Today');
    });
  });

  describe('extractDateExpression', () => {
    it('extracts "today"', () => {
      expect(extractDateExpression('my schedule today')).toBe('today');
    });

    it('extracts "tomorrow"', () => {
      expect(extractDateExpression('what about tomorrow?')).toBe('tomorrow');
    });

    it('extracts "next monday"', () => {
      expect(extractDateExpression('show next monday')).toBe('next monday');
    });

    it('extracts "this week"', () => {
      expect(extractDateExpression('this week schedule')).toBe('this week');
    });

    it('extracts month names', () => {
      expect(extractDateExpression('results in january')).toBe('january');
    });

    it('returns null when no date expression found', () => {
      expect(extractDateExpression('show my attendance')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(extractDateExpression('')).toBeNull();
    });
  });
});
