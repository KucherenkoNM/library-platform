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
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function validateEnv(config: Record<string, unknown>): ApiEnv {
  const parsed = apiEnvSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Invalid API environment:\n${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
}
