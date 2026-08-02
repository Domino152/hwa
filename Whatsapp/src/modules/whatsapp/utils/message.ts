import { getContentType, type WAMessage } from 'baileys';
import { isJidGroup, isJidNewsletter, isJidStatusBroadcast } from 'baileys';
import type { MessageType } from '../../../database/models/Message.js';

export interface ExtractedMessage {
  type: MessageType;
  content: string;
}

export function shouldProcessMessage(msg: WAMessage): boolean {
  if (!msg) return false;
  if (msg.key?.fromMe) return false;

  const jid = msg.key?.remoteJid;
  if (!jid) return false;

  if (isJidGroup(jid)) return false;
  if (isJidNewsletter(jid)) return false;
  if (isJidStatusBroadcast(jid)) return false;

  if (!msg.message) return false;

  return true;
}

export function extractMessageContent(msg: WAMessage): ExtractedMessage {
  if (!msg.message) {
    return { type: 'other', content: '' };
  }

  const contentType = getContentType(msg.message);

  if (!contentType) {
    return { type: 'other', content: '' };
  }

  switch (contentType) {
    case 'conversation':
      return { type: 'text', content: msg.message?.conversation ?? '' };

    case 'extendedTextMessage':
      return { type: 'text', content: msg.message?.extendedTextMessage?.text ?? '' };

    case 'imageMessage':
      return { type: 'image', content: msg.message?.imageMessage?.caption ?? '' };

    case 'videoMessage':
      return { type: 'video', content: msg.message?.videoMessage?.caption ?? '' };

    case 'documentMessage':
      return { type: 'document', content: msg.message?.documentMessage?.caption ?? '' };

    case 'audioMessage':
      return { type: 'audio', content: '' };

    case 'stickerMessage':
      return { type: 'other', content: '[sticker]' };

    case 'contactMessage':
      return { type: 'other', content: '[contact]' };

    case 'locationMessage':
      return { type: 'other', content: '[location]' };

    default:
      return { type: 'other', content: `[${contentType}]` };
  }
}

export function getMessageTimestamp(msg: WAMessage): Date {
  const ts = msg.messageTimestamp;
  if (typeof ts === 'number' || (typeof ts === 'object' && ts !== null && 'low' in ts)) {
    return new Date(toMillis(ts));
  }
  return new Date();
}

function toMillis(ts: number | { low: number; high: number; unsigned?: boolean }): number {
  if (typeof ts === 'number') return ts * 1000;
  return ts.low * 1000;
}

export function getMessageId(msg: WAMessage): string {
  return msg.key?.id ?? 'unknown';
}
