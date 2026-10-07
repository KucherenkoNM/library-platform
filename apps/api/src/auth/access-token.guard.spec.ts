import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { TenantContextService } from '../tenancy/tenant-context.service.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import type { TokenService } from './token.service.js';

function context(authorization?: string): ExecutionContext {
  class Controller {}
  const request = { headers: { authorization } };
  return {
    getHandler: () => () => undefined,
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AccessTokenGuard', () => {
  it('rejects protected routes without a bearer token', async () => {
    const guard = new AccessTokenGuard(
      new Reflector(),
      { verifyAccessToken: vi.fn() } as unknown as TokenService,
      { authSession: { findFirst: vi.fn() } } as unknown as PrismaService,
      new TenantContextService(),
    );

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('populates trusted tenant context from a valid active session', async () => {
    const tenant = new TenantContextService();
    const tokens = {
      verifyAccessToken: vi.fn().mockResolvedValue({
        sub: 'user-a',
        libraryId: 'library-a',
        sessionId: 'session-a',
        type: 'access',
      }),
    } as unknown as TokenService;
    const prisma = {
      authSession: { findFirst: vi.fn().mockResolvedValue({ id: 'session-a' }) },
    } as unknown as PrismaService;
    const guard = new AccessTokenGuard(new Reflector(), tokens, prisma, tenant);

    await expect(guard.canActivate(context('Bearer access-token'))).resolves.toBe(true);
    expect(tenant.requirePrincipal()).toEqual({ userId: 'user-a', libraryId: 'library-a' });
  });

  it('bypasses authentication only for explicitly public handlers', async () => {
    const reflector = new Reflector();
    const handler = () => undefined;
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
    class Controller {}
    const publicContext = {
      getHandler: () => handler,
      getClass: () => Controller,
    } as unknown as ExecutionContext;
    const guard = new AccessTokenGuard(
      reflector,
      { verifyAccessToken: vi.fn() } as unknown as TokenService,
      { authSession: { findFirst: vi.fn() } } as unknown as PrismaService,
      new TenantContextService(),
    );

    await expect(guard.canActivate(publicContext)).resolves.toBe(true);
  });
});
