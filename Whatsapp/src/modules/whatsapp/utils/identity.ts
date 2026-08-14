import { isLidUser, isPnUser, type WAMessage } from 'baileys';
import { extractPhoneFromJid } from './phone.js';

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
  const alternate = key.remoteJidAlt ?? key.participantAlt ?? null;

  let pnJid: string | null = isPnUser(replyJid) ? replyJid : null;
  if (!pnJid && alternate && isPnUser(alternate)) pnJid = alternate;
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
