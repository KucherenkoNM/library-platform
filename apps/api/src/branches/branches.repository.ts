import { Injectable, Scope } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantContextService } from '../tenancy/tenant-context.service.js';
import { TenantScopedRepository } from '../tenancy/tenant-scoped.repository.js';

export type CreateBranchInput = Readonly<{
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
}>;

@Injectable({ scope: Scope.REQUEST })
export class BranchesRepository extends TenantScopedRepository {
  constructor(
    private readonly prisma: PrismaService,
    tenantContext: TenantContextService,
  ) {
    super(tenantContext);
  }

  list() {
    return this.prisma.branch.findMany({
      where: this.tenantWhere({}),
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.branch.findFirst({
      where: this.tenantWhere({ id }),
    });
  }

  create(input: CreateBranchInput) {
    return this.prisma.branch.create({
      data: {
        ...input,
        libraryId: this.libraryId,
      },
    });
  }

  async rename(id: string, name: string) {
    const result = await this.prisma.branch.updateMany({
      where: this.tenantWhere({ id }),
      data: { name },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id);
  }
}
