import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { TenantContextService } from '../tenancy/tenant-context.service.js';
import { PermissionGuard } from './permission.guard.js';
import type { PermissionResolverService } from './permission-resolver.service.js';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator.js';

function executionContext(handler: () => void): ExecutionContext {
  class TestController {}

  return {
    getHandler: () => handler,
    getClass: () => TestController,
  } as unknown as ExecutionContext;
}

describe('PermissionGuard', () => {
  it('allows handlers without permission metadata', async () => {
    const tenantContext = new TenantContextService();
    const hasAll = vi.fn();
    const resolver = { hasAll } as unknown as PermissionResolverService;
    const guard = new PermissionGuard(new Reflector(), tenantContext, resolver);

    await expect(guard.canActivate(executionContext(() => undefined))).resolves.toBe(true);
    expect(hasAll).not.toHaveBeenCalled();
  });

  it('checks required permissions against the server tenant principal', async () => {
    const tenantContext = new TenantContextService();
    tenantContext.setPrincipal({ userId: 'user-a', libraryId: 'library-a' });

    const hasAll = vi.fn().mockResolvedValue(true);
    const resolver = { hasAll } as unknown as PermissionResolverService;
    const guard = new PermissionGuard(new Reflector(), tenantContext, resolver);
    const handler = () => undefined;
    Reflect.defineMetadata(REQUIRED_PERMISSIONS_KEY, ['BOOK_VIEW'], handler);

    await expect(guard.canActivate(executionContext(handler))).resolves.toBe(true);
    expect(hasAll).toHaveBeenCalledWith({ userId: 'user-a', libraryId: 'library-a' }, [
      'BOOK_VIEW',
    ]);
  });

  it('rejects protected handlers when no authenticated tenant context exists', async () => {
    const tenantContext = new TenantContextService();
    const resolver = { hasAll: vi.fn() } as unknown as PermissionResolverService;
    const guard = new PermissionGuard(new Reflector(), tenantContext, resolver);
    const handler = () => undefined;
    Reflect.defineMetadata(REQUIRED_PERMISSIONS_KEY, ['SETTINGS_EDIT'], handler);

    await expect(guard.canActivate(executionContext(handler))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
