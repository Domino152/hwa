import { z } from 'zod';

const WEAK_JWT_PATTERNS = [
  'secret',
  'password',
  'your-super-secret',
  'change-me',
  'default',
  'test-secret',
  'dev-jwt',
  'min-32-chars',
  'keyboard cat',
];

function isWeakJwtSecret(value: string): boolean {
  const lower = value.toLowerCase();
  return WEAK_JWT_PATTERNS.some((pattern) => lower.includes(pattern));
}

const PRIVATE_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

function isPrivateOrInsecureUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return true;
  }

  if (parsed.protocol !== 'https:') return true;

  const hostname = parsed.hostname.toLowerCase();

  if (PRIVATE_HOSTNAMES.has(hostname)) return true;

  const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipMatch) {
    const [, a, b] = ipMatch.map(Number);
    if (a === 10) return true;
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }

  return false;
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    WA_AUTH_STORE: z.enum(['filesystem', 'mongodb']).default('filesystem'),
    WA_AUTH_ENCRYPTION_KEY: z.string().optional(),
    WA_SESSION_ID: z.string().min(1).default('primary'),
    WA_SESSION_DIR: z.string().default('./auth_info'),
    WA_INTERACTIVE_MESSAGES_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    WA_WATCHDOG_INTERVAL_MS: z.coerce.number().int().min(1_000).default(30_000),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    PUBLIC_APP_URL: z.string().default('http://localhost:5173'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(20).default(10),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  })
  .superRefine((data, ctx) => {
    if (data.WA_AUTH_STORE === 'mongodb' && !data.WA_AUTH_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'WA_AUTH_ENCRYPTION_KEY is required when WA_AUTH_STORE=mongodb',
        path: ['WA_AUTH_ENCRYPTION_KEY'],
      });
    } else if (data.WA_AUTH_ENCRYPTION_KEY) {
      const decoded = Buffer.from(data.WA_AUTH_ENCRYPTION_KEY, 'base64');
      if (decoded.length !== 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'WA_AUTH_ENCRYPTION_KEY must decode to exactly 32 bytes',
          path: ['WA_AUTH_ENCRYPTION_KEY'],
        });
      }
    }

    if (data.NODE_ENV === 'production') {
      if (isWeakJwtSecret(data.JWT_SECRET)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'JWT_SECRET contains a weak or default value. Use a cryptographically strong random string in production.',
          path: ['JWT_SECRET'],
        });
      }

      if (!process.env.CORS_ORIGINS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CORS_ORIGINS is required in production',
          path: ['CORS_ORIGINS'],
        });
      }

      if (!process.env.PUBLIC_APP_URL || isPrivateOrInsecureUrl(data.PUBLIC_APP_URL)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'PUBLIC_APP_URL must be a public HTTPS URL in production (no localhost, private IPs, or non-HTTPS)',
          path: ['PUBLIC_APP_URL'],
        });
      }

      if (!data.GEMINI_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GEMINI_API_KEY is required in production for AI features',
          path: ['GEMINI_API_KEY'],
        });
      }

      if (data.WA_AUTH_STORE !== 'mongodb') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'WA_AUTH_STORE must be mongodb in production',
          path: ['WA_AUTH_STORE'],
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const flattened = result.error.flatten();
    console.error('? Invalid environment variables:');
    for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
      console.error(`  ${field}: ${messages.join(', ')}`);
    }
    process.exit(1);
  }
  return result.data;
}
