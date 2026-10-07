import { TenantContextService } from './tenant-context.service.js';

/**
 * Base class for tenant-owned repositories.
 *
 * Tenant identity is always injected from server-side request context. Callers may
 * provide entity filters, but cannot override libraryId because it is applied last.
 */
export abstract class TenantScopedRepository {
  protected constructor(protected readonly tenantContext: TenantContextService) {}

  protected get libraryId(): string {
    return this.tenantContext.requireLibraryId();
  }

  protected tenantWhere<TWhere extends object>(where: TWhere): TWhere & { libraryId: string } {
    return {
      ...where,
      libraryId: this.libraryId,
    };
  }
}
