import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BranchesRepository } from '../../src/branches/branches.repository.js';
import type { ApiEnv } from '../../src/config/env.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { PermissionResolverService } from '../../src/rbac/permission-resolver.service.js';
import { TenantContextService } from '../../src/tenancy/tenant-context.service.js';

config({ path: '../../.env' });
config();

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error('DATABASE_URL is required for tenant isolation integration tests.');
}

const suffix = randomUUID();
const created = {
  libraryIds: [] as string[],
  branchIds: [] as string[],
  roleIds: [] as string[],
  userIds: [] as string[],
};

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
});
const prisma = new PrismaService(configService);

async function createLibrary(label: string) {
  const library = await prisma.library.create({
    data: {
      name: `Isolation ${label}`,
      slug: `isolation-${label.toLowerCase()}-${suffix}`,
      email: `${label.toLowerCase()}-${suffix}@integration.test`,
      phone: '+7 000 000-00-00',
      address: `Integration ${label}`,
      status: 'ACTIVE',
    },
  });
  created.libraryIds.push(library.id);
  return library;
}

describe('tenant isolation integration', () => {
  let libraryAId: string;
  let libraryBId: string;
  let branchAId: string;
  let branchBId: string;

  beforeAll(async () => {
    const libraryA = await createLibrary('A');
    const libraryB = await createLibrary('B');
    libraryAId = libraryA.id;
    libraryBId = libraryB.id;

    const branchA = await prisma.branch.create({
      data: {
        libraryId: libraryA.id,
        name: `Branch A ${suffix}`,
        address: 'A',
        phone: 'A',
        email: `branch-a-${suffix}@integration.test`,
        isActive: true,
      },
    });
    const branchB = await prisma.branch.create({
      data: {
        libraryId: libraryB.id,
        name: `Branch B ${suffix}`,
        address: 'B',
        phone: 'B',
        email: `branch-b-${suffix}@integration.test`,
        isActive: true,
      },
    });
    branchAId = branchA.id;
    branchBId = branchB.id;
    created.branchIds.push(branchA.id, branchB.id);
  });

  afterAll(async () => {
    await prisma.userRole.deleteMany({
      where: { userId: { in: created.userIds } },
    });
    await prisma.rolePermission.deleteMany({
      where: { roleId: { in: created.roleIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: created.userIds } },
    });
    await prisma.role.deleteMany({
      where: { id: { in: created.roleIds } },
    });
    await prisma.branch.deleteMany({
      where: { id: { in: created.branchIds } },
    });
    await prisma.library.deleteMany({
      where: { id: { in: created.libraryIds } },
    });
    await prisma.$disconnect();
  });

  it('scopes reads and writes to the library from server context', async () => {
    const tenantContext = new TenantContextService();
    tenantContext.setPrincipal({ userId: randomUUID(), libraryId: libraryAId });
    const repository = new BranchesRepository(prisma, tenantContext);

    await expect(repository.findById(branchAId)).resolves.toMatchObject({
      id: branchAId,
      libraryId: libraryAId,
    });
    await expect(repository.findById(branchBId)).resolves.toBeNull();
    await expect(repository.rename(branchBId, 'Cross-tenant rename')).resolves.toBeNull();

    const untouchedBranch = await prisma.branch.findUniqueOrThrow({
      where: { id: branchBId },
    });
    expect(untouchedBranch.name).not.toBe('Cross-tenant rename');
  });

  it('does not grant permissions through a role owned by another tenant', async () => {
    const permissionA = await prisma.permission.upsert({
      where: { code: 'BOOK_VIEW' },
      update: { name: 'Просмотр каталога' },
      create: { code: 'BOOK_VIEW', name: 'Просмотр каталога' },
    });
    const permissionB = await prisma.permission.upsert({
      where: { code: 'SETTINGS_EDIT' },
      update: { name: 'Изменение настроек' },
      create: { code: 'SETTINGS_EDIT', name: 'Изменение настроек' },
    });

    const roleA = await prisma.role.create({
      data: {
        libraryId: libraryAId,
        code: `ROLE_A_${suffix}`,
        name: 'Tenant A role',
        isSystem: false,
      },
    });
    const roleB = await prisma.role.create({
      data: {
        libraryId: libraryBId,
        code: `ROLE_B_${suffix}`,
        name: 'Tenant B role',
        isSystem: false,
      },
    });
    created.roleIds.push(roleA.id, roleB.id);

    await prisma.rolePermission.createMany({
      data: [
        { roleId: roleA.id, permissionId: permissionA.id },
        { roleId: roleB.id, permissionId: permissionB.id },
      ],
    });

    const userA = await prisma.user.create({
      data: {
        libraryId: libraryAId,
        email: `user-a-${suffix}@integration.test`,
        passwordHash: 'integration-test-only',
        firstName: 'Tenant',
        lastName: 'A',
        status: 'ACTIVE',
      },
    });
    created.userIds.push(userA.id);

    // Deliberately create an invalid cross-tenant assignment at the join-table level.
    // PermissionResolverService must still ignore it because effective roles are tenant-filtered.
    await prisma.userRole.createMany({
      data: [
        { userId: userA.id, roleId: roleA.id },
        { userId: userA.id, roleId: roleB.id },
      ],
    });

    const resolver = new PermissionResolverService(prisma);
    const effective = await resolver.resolveForUser({
      userId: userA.id,
      libraryId: libraryAId,
    });

    expect(effective.has('BOOK_VIEW')).toBe(true);
    expect(effective.has('SETTINGS_EDIT')).toBe(false);
  });
});
