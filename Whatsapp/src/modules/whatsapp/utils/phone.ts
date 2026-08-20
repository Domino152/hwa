import { ValidationError } from '../../../shared/utils/errors.js';

const DIGITS_ONLY = /\D/g;
const JID_REGEX = /^[0-9]{7,15}@s\.whatsapp\.net$/;
const LID_JID_REGEX = /^[0-9]+@lid$/;
const MIN_PHONE_LENGTH = 7;
const MAX_PHONE_LENGTH = 20;

export function normalizePhoneNumber(input: string): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Phone must be a string', { phone: ['Invalid type'] });
  }

  const digits = input.replace(DIGITS_ONLY, '');

  if (digits.length === 0) {
    throw new ValidationError('Phone number is empty', { phone: ['Empty input'] });
  }

  if (digits.length < MIN_PHONE_LENGTH) {
    throw new ValidationError(
      `Phone number too short (minimum ${MIN_PHONE_LENGTH} digits)`,
      { phone: [`Got ${digits.length} digits, minimum ${MIN_PHONE_LENGTH}`] },
    );
  }

  if (digits.length > MAX_PHONE_LENGTH) {
    throw new ValidationError(
      `Phone number too long (maximum ${MAX_PHONE_LENGTH} digits)`,
      { phone: [`Got ${digits.length} digits, maximum ${MAX_PHONE_LENGTH}`] },
    );
  }

  return digits;
}

export function formatJid(phone: string, domain: string = 's.whatsapp.net'): string {
  if (isValidJid(phone)) {
    return phone;
  }

  const digits = normalizePhoneNumber(phone);
  return `${digits}@${domain}`;
}

export function extractPhoneFromJid(jid: string): string {
  const atIndex = jid.indexOf('@');
  return atIndex === -1 ? jid : jid.substring(0, atIndex);
}

export function isValidJid(jid: string): boolean {
  return typeof jid === 'string' && JID_REGEX.test(jid);
}

/**
 * Check whether a JID is a WhatsApp Linked Device ID (LID).
 * LIDs look like "151621002616864@lid" — they represent the account on a
 * linked device (e.g. WhatsApp Web) and are NOT real phone numbers.
 */
export function isLidJid(jid: string): boolean {
  return typeof jid === 'string' && LID_JID_REGEX.test(jid);
}

export const JID_DOMAIN = 's.whatsapp.net';
