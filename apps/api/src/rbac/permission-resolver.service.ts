import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TenantPrincipal } from '../tenancy/tenant-context.types.js';
import { isPermissionCode, type PermissionCode } from './permissions.js';

@Injectable()
export class PermissionResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForUser(principal: TenantPrincipal): Promise<Set<PermissionCode>> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: principal.userId,
        libraryId: principal.libraryId,
      },
      select: {
        userRoles: {
          where: {
            role: {
              libraryId: principal.libraryId,
            },
          },
          select: {
            role: {
              select: {
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (user === null) {
      return new Set<PermissionCode>();
    }

    const permissions = new Set<PermissionCode>();

    for (const userRole of user.userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        const { code } = rolePermission.permission;
        if (isPermissionCode(code)) {
          permissions.add(code);
        }
      }
    }

    return permissions;
  }

  async hasAll(principal: TenantPrincipal, required: readonly PermissionCode[]): Promise<boolean> {
    if (required.length === 0) {
      return true;
    }

    const effective = await this.resolveForUser(principal);
    return required.every((permission) => effective.has(permission));
  }
}
