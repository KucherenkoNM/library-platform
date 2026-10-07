import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.js';

const validEnv = {
  NODE_ENV: 'test',
  API_PORT: '3001',
  WEB_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_ACCESS_KEY: 'test',
  S3_SECRET_KEY: 'test-secret',
  S3_BUCKET: 'test-bucket',
  S3_FORCE_PATH_STYLE: 'true',
  AUTH_ACCESS_TOKEN_SECRET: 'stage2-test-secret-with-at-least-32-characters',
  AUTH_COOKIE_SECURE: 'false',
};

describe('validateEnv', () => {
  it('parses the complete API environment', () => {
    const env = validateEnv(validEnv);
    expect(env.API_PORT).toBe(3001);
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
  });

  it('rejects missing infrastructure configuration', () => {
    expect(() => validateEnv({ NODE_ENV: 'test' })).toThrow('Invalid API environment');
  });
});
