import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationState,
  type SignalDataSet,
  type SignalDataTypeMap,
} from 'baileys';
import { WhatsAppAuthState } from '../../database/models/WhatsAppAuthState.js';

const CREDS_KEY = 'creds';
const IV_LENGTH = 12;

interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export interface MongoAuthStateResult {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clear: () => Promise<void>;
}

function decodeEncryptionKey(encoded: string): Buffer {
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) {
    throw new Error('WA_AUTH_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }
  return key;
}

function encryptValue(
  value: unknown,
  encryptionKey: Buffer,
  associatedData: string,
): EncryptedPayload {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  cipher.setAAD(Buffer.from(associatedData));
  const plaintext = JSON.stringify(value, BufferJSON.replacer);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

function decryptValue<T>(
  payload: EncryptedPayload,
  encryptionKey: Buffer,
  associatedData: string,
): T {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(payload.iv, 'base64'),
  );
  decipher.setAAD(Buffer.from(associatedData));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(plaintext, BufferJSON.reviver) as T;
}

export async function useMongoAuthState(
  sessionId: string,
  encodedEncryptionKey: string,
): Promise<MongoAuthStateResult> {
  const encryptionKey = decodeEncryptionKey(encodedEncryptionKey);

  const readData = async <T>(authKey: string): Promise<T | null> => {
    const document = await WhatsAppAuthState.findOne({ sessionId, authKey }).lean();
    if (!document) return null;
    return decryptValue<T>(document, encryptionKey, `${sessionId}:${authKey}`);
  };

  const writeData = async (authKey: string, value: unknown): Promise<void> => {
    const encrypted = encryptValue(value, encryptionKey, `${sessionId}:${authKey}`);
    await WhatsAppAuthState.updateOne(
      { sessionId, authKey },
      { $set: encrypted },
      { upsert: true },
    );
  };

  const creds = (await readData<AuthenticationState['creds']>(CREDS_KEY)) ?? initAuthCreds();

  const keys: AuthenticationState['keys'] = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
      const result: { [id: string]: SignalDataTypeMap[T] } = {};
      await Promise.all(
        ids.map(async (id) => {
          const authKey = `${type}:${id}`;
          let value = await readData<SignalDataTypeMap[T]>(authKey);
          if (type === 'app-state-sync-key' && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(
              value as unknown as Record<string, unknown>,
            ) as unknown as SignalDataTypeMap[T];
          }
          if (value) result[id] = value;
        }),
      );
      return result;
    },
    set: async (data: SignalDataSet) => {
      const operations: Array<Promise<void>> = [];
      for (const [type, entries] of Object.entries(data)) {
        if (!entries) continue;
        for (const [id, value] of Object.entries(entries)) {
          const authKey = `${type}:${id}`;
          if (value === null) {
            operations.push(
              WhatsAppAuthState.deleteOne({ sessionId, authKey }).then(() => undefined),
            );
          } else {
            operations.push(writeData(authKey, value));
          }
        }
      }
      await Promise.all(operations);
    },
    clear: async () => {
      await WhatsAppAuthState.deleteMany({ sessionId, authKey: { $ne: CREDS_KEY } });
    },
  };

  return {
    state: { creds, keys },
    saveCreds: () => writeData(CREDS_KEY, creds),
    clear: async () => {
      await WhatsAppAuthState.deleteMany({ sessionId });
    },
  };
}
