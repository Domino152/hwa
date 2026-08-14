import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SignalDataSet } from 'baileys';

interface StoredDocument {
  sessionId: string;
  authKey: string;
  ciphertext: string;
  iv: string;
  authTag: string;
}

const mocks = vi.hoisted(() => ({
  documents: new Map<string, StoredDocument>(),
}));

vi.mock('../../src/database/models/WhatsAppAuthState.js', () => ({
  WhatsAppAuthState: {
    findOne: ({ sessionId, authKey }: { sessionId: string; authKey: string }) => ({
      lean: async () => mocks.documents.get(`${sessionId}:${authKey}`) ?? null,
    }),
    updateOne: async (
      { sessionId, authKey }: { sessionId: string; authKey: string },
      update: { $set: Omit<StoredDocument, 'sessionId' | 'authKey'> },
    ) => {
      mocks.documents.set(`${sessionId}:${authKey}`, { sessionId, authKey, ...update.$set });
    },
    deleteOne: async ({ sessionId, authKey }: { sessionId: string; authKey: string }) => {
      mocks.documents.delete(`${sessionId}:${authKey}`);
    },
    deleteMany: async ({ sessionId }: { sessionId: string }) => {
      for (const [key, document] of mocks.documents) {
        if (document.sessionId === sessionId) mocks.documents.delete(key);
      }
    },
  },
}));

import { useMongoAuthState } from '../../src/modules/whatsapp/mongo-auth-state.js';

const encryptionKey = Buffer.alloc(32, 7).toString('base64');

describe('Mongo WhatsApp auth state', () => {
  beforeEach(() => mocks.documents.clear());

  it('persists encrypted credentials across adapter instances', async () => {
    const first = await useMongoAuthState('primary', encryptionKey);
    first.state.creds.registered = true;
    await first.saveCreds();

    const stored = mocks.documents.get('primary:creds');
    expect(stored?.ciphertext).not.toContain('registered');

    const second = await useMongoAuthState('primary', encryptionKey);
    expect(second.state.creds.registered).toBe(true);
  });

  it('round-trips binary Signal keys and deletes null entries', async () => {
    const auth = await useMongoAuthState('primary', encryptionKey);
    await auth.state.keys.set({ session: { alice: Uint8Array.from([1, 2, 3]) } });
    const loaded = await auth.state.keys.get('session', ['alice']);
    expect(Array.from(loaded.alice!)).toEqual([1, 2, 3]);

    await auth.state.keys.set({ session: { alice: null } });
    expect(await auth.state.keys.get('session', ['alice'])).toEqual({});
  });

  it('persists concurrent key updates without overwriting sibling keys', async () => {
    const auth = await useMongoAuthState('primary', encryptionKey);
    await Promise.all([
      auth.state.keys.set({ 'lid-mapping': { lid1: 'pn1' } }),
      auth.state.keys.set({ 'lid-mapping': { lid2: 'pn2' } }),
    ]);
    expect(await auth.state.keys.get('lid-mapping', ['lid1', 'lid2'])).toEqual({
      lid1: 'pn1',
      lid2: 'pn2',
    });
  });

  it('restores app-state protobuf data', async () => {
    const auth = await useMongoAuthState('primary', encryptionKey);
    const data = { keyData: Uint8Array.from([4, 5, 6]) };
    await auth.state.keys.set({
      'app-state-sync-key': { app: data },
    } as SignalDataSet);
    const loaded = await auth.state.keys.get('app-state-sync-key', ['app']);
    expect(Array.from(loaded.app!.keyData!)).toEqual([4, 5, 6]);
  });

  it('rejects an invalid key and cannot decrypt with the wrong valid key', async () => {
    await expect(useMongoAuthState('primary', 'not-base64')).rejects.toThrow(
      'WA_AUTH_ENCRYPTION_KEY',
    );
    const auth = await useMongoAuthState('primary', encryptionKey);
    await auth.saveCreds();
    const wrongKey = Buffer.alloc(32, 8).toString('base64');
    await expect(useMongoAuthState('primary', wrongKey)).rejects.toThrow();
  });
});
