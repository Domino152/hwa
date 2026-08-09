import { describe, it, expect } from 'vitest';
import {
  extractMessageContent,
  shouldProcessMessage,
  getMessageTimestamp,
  getMessageId,
} from '../../src/modules/whatsapp/utils/message.js';
import type { WAMessage } from 'baileys';

describe('Message Utility', () => {
  describe('shouldProcessMessage', () => {
    it('returns false for messages from me', () => {
      const msg = { key: { fromMe: true, remoteJid: '123@s.whatsapp.net' } } as WAMessage;
      expect(shouldProcessMessage(msg)).toBe(false);
    });

    it('returns false for group messages', () => {
      const msg = {
        key: { fromMe: false, remoteJid: '123@g.us' },
        message: { conversation: 'hello' },
      } as unknown as WAMessage;
      expect(shouldProcessMessage(msg)).toBe(false);
    });

    it('returns false for newsletter messages', () => {
      const msg = {
        key: { fromMe: false, remoteJid: '123@newsletter' },
        message: { conversation: 'hello' },
      } as unknown as WAMessage;
      expect(shouldProcessMessage(msg)).toBe(false);
    });

    it('returns false for status broadcasts', () => {
      const msg = {
        key: { fromMe: false, remoteJid: 'status@broadcast' },
        message: { conversation: 'hello' },
      } as unknown as WAMessage;
      expect(shouldProcessMessage(msg)).toBe(false);
    });

    it('returns false for messages without remoteJid', () => {
      const msg = { key: { fromMe: false } } as WAMessage;
      expect(shouldProcessMessage(msg)).toBe(false);
    });

    it('returns false for messages without message body', () => {
      const msg = {
        key: { fromMe: false, remoteJid: '123@s.whatsapp.net' },
      } as WAMessage;
      expect(shouldProcessMessage(msg)).toBe(false);
    });

    it('returns true for valid personal messages', () => {
      const msg = {
        key: { fromMe: false, remoteJid: '123@s.whatsapp.net' },
        message: { conversation: 'hi' },
      } as unknown as WAMessage;
      expect(shouldProcessMessage(msg)).toBe(true);
    });
  });

  describe('extractMessageContent', () => {
    it('extracts plain text', () => {
      const msg = {
        message: { conversation: 'Hello world' },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('text');
      expect(result.content).toBe('Hello world');
    });

    it('extracts extended text', () => {
      const msg = {
        message: { extendedTextMessage: { text: 'extended' } },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('text');
      expect(result.content).toBe('extended');
    });

    it('extracts image caption', () => {
      const msg = {
        message: { imageMessage: { caption: 'look at this' } },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('image');
      expect(result.content).toBe('look at this');
    });

    it('extracts video caption', () => {
      const msg = {
        message: { videoMessage: { caption: 'check this video' } },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('video');
      expect(result.content).toBe('check this video');
    });

    it('extracts document caption', () => {
      const msg = {
        message: { documentMessage: { caption: 'invoice' } },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('document');
      expect(result.content).toBe('invoice');
    });

    it('returns empty content for audio', () => {
      const msg = {
        message: { audioMessage: {} },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('audio');
      expect(result.content).toBe('');
    });

    it('returns other for unknown message types', () => {
      const msg = {
        message: { unknownType: {} },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('other');
      expect(result.content).toBe('');
    });

    it('returns other for empty message', () => {
      const msg = { message: {} } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('other');
      expect(result.content).toBe('');
    });

    it('extracts buttonsResponseMessage content', () => {
      const msg = {
        message: {
          buttonsResponseMessage: {
            selectedButtonId: 'intent:attendance',
          },
        },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('text');
      expect(result.content).toBe('intent:attendance');
    });

    it('extracts listResponseMessage content', () => {
      const msg = {
        message: {
          listResponseMessage: {
            selectedRowId: 'intent:fees',
          },
        },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('text');
      expect(result.content).toBe('intent:fees');
    });

    it('extracts interactiveResponseMessage with nativeFlowResponseMessage', () => {
      const msg = {
        message: {
          interactiveResponseMessage: {
            nativeFlowResponseMessage: {
              paramsJson: JSON.stringify({ id: 'intent:schedule' }),
            },
          },
        },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('text');
      expect(result.content).toBe('intent:schedule');
    });

    it('extracts interactiveResponseMessage with selected field', () => {
      const msg = {
        message: {
          interactiveResponseMessage: {
            nativeFlowResponseMessage: {
              paramsJson: JSON.stringify({ selected: 'intent:results' }),
            },
          },
        },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('text');
      expect(result.content).toBe('intent:results');
    });

    it('handles malformed interactiveResponseMessage gracefully', () => {
      const msg = {
        message: {
          interactiveResponseMessage: {
            nativeFlowResponseMessage: {
              paramsJson: 'not-valid-json',
            },
          },
        },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('text');
      expect(result.content).toBe('not-valid-json');
    });

    it('handles interactiveResponseMessage without paramsJson', () => {
      const msg = {
        message: {
          interactiveResponseMessage: {
            nativeFlowResponseMessage: {},
          },
        },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('other');
    });

    it('handles missing buttonsResponseMessage selectedButtonId', () => {
      const msg = {
        message: {
          buttonsResponseMessage: {},
        },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('text');
      expect(result.content).toBe('');
    });

    it('handles missing listResponseMessage selectedRowId', () => {
      const msg = {
        message: {
          listResponseMessage: {},
        },
      } as unknown as WAMessage;
      const result = extractMessageContent(msg);
      expect(result.type).toBe('text');
      expect(result.content).toBe('');
    });
  });

  describe('getMessageTimestamp', () => {
    it('converts number timestamp to Date', () => {
      const msg = { messageTimestamp: 1700000000 } as unknown as WAMessage;
      const result = getMessageTimestamp(msg);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(1700000000 * 1000);
    });

    it('returns current time for missing timestamp', () => {
      const msg = {} as unknown as WAMessage;
      const result = getMessageTimestamp(msg);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('getMessageId', () => {
    it('returns the message ID', () => {
      const msg = { key: { id: 'ABC123' } } as unknown as WAMessage;
      expect(getMessageId(msg)).toBe('ABC123');
    });

    it('returns "unknown" for missing ID', () => {
      const msg = { key: {} } as unknown as WAMessage;
      expect(getMessageId(msg)).toBe('unknown');
    });
  });
});
