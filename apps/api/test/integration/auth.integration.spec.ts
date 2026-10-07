import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { config } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthService } from '../../src/auth/auth.service.js';
import { PasswordService } from '../../src/auth/password.service.js';
import { TokenService } from '../../src/auth/token.service.js';
import type { ApiEnv } from '../../src/config/env.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { PermissionResolverService } from '../../src/rbac/permission-resolver.service.js';

config({ path: '../../.env' });
config();

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error('DATABASE_URL is required for auth integration tests.');
}

const suffix = randomUUID();
const configService = new ConfigService<ApiEnv, true>({
  NODE_ENV: 'test',
  API_PORT: 3000,
  WEB_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: databaseUrl,
  REDIS_URL: 'redis://localhost:6379',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_ACCESS_KEY: 'integration-test',
  S3_SECRET_KEY: 'integration-test',
  S3_BUCKET: 'integration-test',
  S3_FORCE_PATH_STYLE: true,
  AUTH_ACCESS_TOKEN_SECRET: 'integration-test-access-secret-with-at-least-32-chars',
  AUTH_ACCESS_TOKEN_TTL_SECONDS: 900,
  AUTH_REFRESH_TOKEN_TTL_DAYS: 30,
  AUTH_REFRESH_COOKIE_NAME: 'chitay_refresh',
  AUTH_COOKIE_SECURE: false,
  AUTH_TOKEN_ISSUER: 'chitay-api-test',
  AUTH_TOKEN_AUDIENCE: 'chitay-web-test',
});
const prisma = new PrismaService(configService);
const passwords = new PasswordService();
const tokens = new TokenService(configService);
const permissions = new PermissionResolverService(prisma);
const auth = new AuthService(prisma, passwords, tokens, permissions);

let libraryAId = '';
let libraryBId = '';
let userAId = '';
const password = 'Stage2-Integration-Password-123!';

const meta = { ipAddress: '127.0.0.1', userAgent: 'vitest' } as const;

describe('authentication integration', () => {
  beforeAll(async () => {
    const [libraryA, libraryB] = await Promise.all([
      prisma.library.create({
        data: {
          name: `Auth A ${suffix}`,
          slug: `auth-a-${suffix}`,
          email: `auth-a-${suffix}@integration.test`,
          phone: 'A',
          address: 'A',
          status: 'ACTIVE',
        },
      }),
      prisma.library.create({
        data: {
          name: `Auth B ${suffix}`,
          slug: `auth-b-${suffix}`,
          email: `auth-b-${suffix}@integration.test`,
          phone: 'B',
          address: 'B',
          status: 'ACTIVE',
        },
      }),
    ]);
    libraryAId = libraryA.id;
    libraryBId = libraryB.id;

    const user = await prisma.user.create({
      data: {
        libraryId: libraryA.id,
        email: `auth-user-${suffix}@integration.test`,
        passwordHash: await passwords.hash(password),
        firstName: 'Auth',
        lastName: 'User',
        status: 'ACTIVE',
      },
    });
    userAId = user.id;
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { userId: userAId } });
    await prisma.user.deleteMany({ where: { id: userAId } });
    await prisma.library.deleteMany({ where: { id: { in: [libraryAId, libraryBId] } } });
    await prisma.$disconnect();
  });

  it('logs in successfully and rejects wrong credentials with the same generic error', async () => {
    const email = `auth-user-${suffix}@integration.test`;
    const result = await auth.login(email, password, meta);

    expect(result.user.id).toBe(userAId);
    expect(result.user.libraryId).toBe(libraryAId);
    expect(result.accessToken.length).toBeGreaterThan(20);
    expect(result.refreshToken.length).toBeGreaterThan(20);

    await expect(auth.login(email, 'wrong-password', meta)).rejects.toMatchObject({
      message: 'Invalid email or password.',
    });
    await expect(auth.login(`missing-${suffix}@integration.test`, 'wrong-password', meta)).rejects.toMatchObject({
      message: 'Invalid email or password.',
    });
  });

  it('rotates refresh tokens and detects reuse of the previous token', async () => {
    const login = await auth.login(`auth-user-${suffix}@integration.test`, password, meta);
    const refreshed = await auth.refresh(login.refreshToken, meta);

    expect(refreshed.refreshToken).not.toBe(login.refreshToken);
    await expect(auth.refresh(login.refreshToken, meta)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(auth.refresh(refreshed.refreshToken, meta)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalid and expired refresh tokens', async () => {
    await expect(auth.refresh('not-a-real-refresh-token', meta)).rejects.toBeInstanceOf(UnauthorizedException);

    const login = await auth.login(`auth-user-${suffix}@integration.test`, password, meta);
    const hash = tokens.hashRefreshToken(login.refreshToken);
    await prisma.authSession.update({ where: { tokenHash: hash }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(auth.refresh(login.refreshToken, meta)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not resolve a user through a different tenant', async () => {
    await expect(auth.currentUser(userAId, libraryBId)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes every active refresh session on logout-all', async () => {
    const first = await auth.login(`auth-user-${suffix}@integration.test`, password, meta);
    const second = await auth.login(`auth-user-${suffix}@integration.test`, password, meta);

    await auth.logoutAll(userAId, libraryAId);
    await expect(auth.refresh(first.refreshToken, meta)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(auth.refresh(second.refreshToken, meta)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
