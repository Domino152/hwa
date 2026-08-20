import { isLidUser, type WAMessage } from 'baileys';
import { extractPhoneFromJid } from './phone.js';

function isPnJid(jid: string): boolean {
  return typeof jid === 'string' && /^\d+@s\.whatsapp\.net$/.test(jid);
}

export interface InboundIdentity {
  replyJid: string;
  phone: string | null;
  identityKey: string;
  pnJid: string | null;
  lidJid: string | null;
}

export async function resolveInboundIdentity(
  message: WAMessage,
  resolvePnForLid: (lid: string) => Promise<string | null>,
): Promise<InboundIdentity> {
  const key = message.key;
  const replyJid = key.remoteJid ?? '';
  const alternate = (key as Record<string, unknown>)['remoteJidAlt'] as string | undefined
    ?? (key as Record<string, unknown>)['participantAlt'] as string | undefined
    ?? null;

  let pnJid: string | null = isPnJid(replyJid) ? replyJid : null;
  if (!pnJid && alternate && isPnJid(alternate)) pnJid = alternate;
  if (!pnJid && isLidUser(replyJid)) pnJid = await resolvePnForLid(replyJid);

  const lidJid = isLidUser(replyJid)
    ? replyJid
    : alternate && isLidUser(alternate)
      ? alternate
      : null;
  const phone = pnJid ? extractPhoneFromJid(pnJid) : null;

  return {
    replyJid,
    phone,
    identityKey: phone ?? `lid:${extractPhoneFromJid(replyJid)}`,
    pnJid,
    lidJid,
  };
}
