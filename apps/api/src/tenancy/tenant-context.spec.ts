import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { TenantContextService } from './tenant-context.service.js';

describe('TenantContextService', () => {
  it('requires a server-populated principal before tenant access', () => {
    const context = new TenantContextService();

    expect(() => context.requireLibraryId()).toThrow(UnauthorizedException);
  });

  it('returns the library from the initialized principal', () => {
    const context = new TenantContextService();
    context.setPrincipal({ userId: 'user-a', libraryId: 'library-a' });

    expect(context.requireLibraryId()).toBe('library-a');
    expect(context.requirePrincipal()).toEqual({
      userId: 'user-a',
      libraryId: 'library-a',
    });
  });

  it('does not allow the tenant identity to switch during one request', () => {
    const context = new TenantContextService();
    context.setPrincipal({ userId: 'user-a', libraryId: 'library-a' });

    expect(() => context.setPrincipal({ userId: 'user-b', libraryId: 'library-b' })).toThrow(
      'Tenant context cannot be switched during the same request.',
    );
  });
});
