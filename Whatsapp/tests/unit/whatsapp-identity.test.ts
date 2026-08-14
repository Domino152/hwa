import { describe, expect, it, vi } from 'vitest';
import type { WAMessage } from 'baileys';
import { resolveInboundIdentity } from '../../src/modules/whatsapp/utils/identity.js';

describe('WhatsApp inbound identity', () => {
  it('uses remoteJidAlt as the verified phone while retaining the LID reply address', async () => {
    const message = {
      key: {
        id: 'message-1',
        remoteJid: '155212148928716@lid',
        remoteJidAlt: '919999999999@s.whatsapp.net',
      },
    } as unknown as WAMessage;
    const identity = await resolveInboundIdentity(message, vi.fn());
    expect(identity).toEqual({
      replyJid: '155212148928716@lid',
      phone: '919999999999',
      identityKey: '919999999999',
      pnJid: '919999999999@s.whatsapp.net',
      lidJid: '155212148928716@lid',
    });
  });

  it('does not treat an unresolved LID as a phone number', async () => {
    const message = {
      key: { id: 'message-2', remoteJid: '155212148928716@lid' },
    } as unknown as WAMessage;
    const identity = await resolveInboundIdentity(message, async () => null);
    expect(identity.phone).toBeNull();
    expect(identity.identityKey).toBe('lid:155212148928716');
  });

  it('uses the v7 LID mapping store when the message has no alternate JID', async () => {
    const resolvePn = vi.fn(async () => '919999999999@s.whatsapp.net');
    const message = {
      key: { id: 'message-3', remoteJid: '155212148928716@lid' },
    } as unknown as WAMessage;
    const identity = await resolveInboundIdentity(message, resolvePn);
    expect(resolvePn).toHaveBeenCalledWith('155212148928716@lid');
    expect(identity.phone).toBe('919999999999');
  });
});
