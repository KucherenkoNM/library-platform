import { z } from 'zod';

const booleanFromString = z.preprocess(
  (value) => value ?? 'true',
  z.enum(['true', 'false']),
).transform((value) => value === 'true');

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(3),
  S3_FORCE_PATH_STYLE: booleanFromString,
  AUTH_ACCESS_TOKEN_SECRET: z.string().min(32),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  AUTH_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  AUTH_REFRESH_COOKIE_NAME: z.string().min(1).default('chitay_refresh'),
  AUTH_COOKIE_SECURE: booleanFromString.default(false),
  AUTH_TOKEN_ISSUER: z.string().min(1).default('chitay-api'),
  AUTH_TOKEN_AUDIENCE: z.string().min(1).default('chitay-web'),
  AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100).default(10),
  AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(60).max(86400).default(600),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === 'production' && !value.AUTH_COOKIE_SECURE) {
    ctx.addIssue({ code: 'custom', path: ['AUTH_COOKIE_SECURE'], message: 'must be true in production' });
  }
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function validateEnv(config: Record<string, unknown>): ApiEnv {
  const parsed = apiEnvSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Invalid API environment:\n${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
}
