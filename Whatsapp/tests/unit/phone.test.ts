import { describe, it, expect } from 'vitest';
import {
  normalizePhoneNumber,
  formatJid,
  extractPhoneFromJid,
  isValidJid,
  isLidJid,
} from '../../src/modules/whatsapp/utils/phone.js';

describe('Phone Utility', () => {
  describe('normalizePhoneNumber', () => {
    it('strips non-digit characters', () => {
      expect(normalizePhoneNumber('+91 7530063885')).toBe('917530063885');
      expect(normalizePhoneNumber('(234) 567-8901')).toBe('2345678901');
      expect(normalizePhoneNumber('917530063885')).toBe('917530063885');
      expect(normalizePhoneNumber(' +1-234-567-8901 ')).toBe('12345678901');
    });

    it('handles plain digit strings', () => {
      expect(normalizePhoneNumber('1234567890')).toBe('1234567890');
    });

    it('throws on empty string', () => {
      expect(() => normalizePhoneNumber('')).toThrow();
      expect(() => normalizePhoneNumber('abc++')).toThrow();
    });

    it('throws on too-short numbers', () => {
      expect(() => normalizePhoneNumber('123456')).toThrow();
    });

    it('throws on too-long numbers', () => {
      expect(() => normalizePhoneNumber('123456789012345678901')).toThrow();
    });

    it('throws on non-string input', () => {
      expect(() => normalizePhoneNumber(null as unknown as string)).toThrow();
      expect(() => normalizePhoneNumber(undefined as unknown as string)).toThrow();
      expect(() => normalizePhoneNumber(123 as unknown as string)).toThrow();
    });
  });

  describe('formatJid', () => {
    it('formats digits to JID', () => {
      expect(formatJid('917530063885')).toBe('917530063885@s.whatsapp.net');
    });

    it('passes through existing valid JIDs', () => {
      expect(formatJid('917530063885@s.whatsapp.net')).toBe('917530063885@s.whatsapp.net');
    });

    it('normalizes whitespace and formatting before building JID', () => {
      expect(formatJid('+91 7530063885')).toBe('917530063885@s.whatsapp.net');
      expect(formatJid('(234) 567-8901')).toBe('2345678901@s.whatsapp.net');
    });

    it('throws on invalid phone', () => {
      expect(() => formatJid('abc')).toThrow();
      expect(() => formatJid('')).toThrow();
    });

    it('formats digits to LID JID when domain is "lid"', () => {
      expect(formatJid('151621002616864', 'lid')).toBe('151621002616864@lid');
    });
  });

  describe('extractPhoneFromJid', () => {
    it('extracts digits from JID', () => {
      expect(extractPhoneFromJid('917530063885@s.whatsapp.net')).toBe('917530063885');
    });

    it('returns input if no @', () => {
      expect(extractPhoneFromJid('917530063885')).toBe('917530063885');
    });
  });

  describe('isValidJid', () => {
    it('returns true for valid JIDs', () => {
      expect(isValidJid('917530063885@s.whatsapp.net')).toBe(true);
      expect(isValidJid('1234567@s.whatsapp.net')).toBe(true);
    });

    it('returns false for invalid JIDs', () => {
      expect(isValidJid('917530063885')).toBe(false);
      expect(isValidJid('123456@s.whatsapp.net')).toBe(false);
      expect(isValidJid('abcdefghij@s.whatsapp.net')).toBe(false);
      expect(isValidJid('1234567890@s.whatsapp.NET')).toBe(false);
    });
  });

  describe('isLidJid', () => {
    it('returns true for LID-format JIDs', () => {
      expect(isLidJid('151621002616864@lid')).toBe(true);
      expect(isLidJid('1234567890@lid')).toBe(true);
    });

    it('returns false for regular phone JIDs', () => {
      expect(isLidJid('917530063885@s.whatsapp.net')).toBe(false);
      expect(isLidJid('917530063885')).toBe(false);
    });

    it('returns false for invalid LID JIDs', () => {
      expect(isLidJid('151621002616864@LID')).toBe(false);
      expect(isLidJid('abcdefghij@lid')).toBe(false);
    });
  });
});
