import { Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import type { TenantPrincipal } from './tenant-context.types.js';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private principal: TenantPrincipal | null = null;

  setPrincipal(principal: TenantPrincipal): void {
    if (
      this.principal !== null &&
      (this.principal.userId !== principal.userId ||
        this.principal.libraryId !== principal.libraryId)
    ) {
      throw new Error('Tenant context cannot be switched during the same request.');
    }

    this.principal = Object.freeze({ ...principal });
  }

  getPrincipal(): TenantPrincipal | null {
    return this.principal;
  }

  requirePrincipal(): TenantPrincipal {
    if (this.principal === null) {
      throw new UnauthorizedException('Authenticated tenant context is required.');
    }

    return this.principal;
  }

  requireLibraryId(): string {
    return this.requirePrincipal().libraryId;
  }
}
