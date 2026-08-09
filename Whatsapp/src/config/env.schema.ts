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

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
      .default('info'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    WA_SESSION_DIR: z.string().default('./auth_info'),
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    LOGIN_PORTAL_URL: z.string().default('http://localhost:5173/login'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(20).default(10),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  })
  .superRefine((data, ctx) => {
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

      if (!process.env.LOGIN_PORTAL_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'LOGIN_PORTAL_URL is required in production',
          path: ['LOGIN_PORTAL_URL'],
        });
      }

      if (!data.GEMINI_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GEMINI_API_KEY is required in production for AI features',
          path: ['GEMINI_API_KEY'],
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
