import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { PERMISSIONS, type PermissionCode } from '../rbac/permissions.js';
import { SYSTEM_ROLE_TEMPLATES } from '../rbac/system-role-templates.js';

config({ path: '../../.env' });
config();

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const permissionNames: Record<PermissionCode, string> = {
  BOOK_VIEW: 'Просмотр каталога',
  BOOK_CREATE: 'Создание книг',
  BOOK_EDIT: 'Редактирование книг',
  COPY_CREATE: 'Создание экземпляров',
  COPY_EDIT: 'Редактирование экземпляров',
  COPY_WRITE_OFF: 'Списание экземпляров',
  READER_VIEW: 'Просмотр читателей',
  READER_CREATE: 'Создание читателей',
  READER_EDIT: 'Редактирование читателей',
  READER_BLOCK: 'Блокировка читателей',
  LOAN_CREATE: 'Выдача книг',
  LOAN_RETURN: 'Возврат книг',
  LOAN_RENEW: 'Продление выдач',
  RESERVATION_MANAGE: 'Управление бронированиями',
  INVENTORY_MANAGE: 'Управление инвентаризацией',
  EMPLOYEE_MANAGE: 'Управление сотрудниками',
  ROLE_MANAGE: 'Управление ролями',
  ANALYTICS_VIEW: 'Просмотр аналитики',
  AUDIT_VIEW: 'Просмотр журнала действий',
  SETTINGS_EDIT: 'Изменение настроек',
};

const demoAdminPasswordHash =
  '$argon2id$v=19$m=19456,t=2,p=1$MMpp3EiLDLxE+5QjBfPCSg$i3Ak24Kp7KRu1ZfsBZ/qYISKbqHyRUFQlUOTErTGNBY';

async function seedPermissions(): Promise<Map<PermissionCode, string>> {
  const ids = new Map<PermissionCode, string>();

  for (const code of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: { name: permissionNames[code] },
      create: {
        code,
        name: permissionNames[code],
      },
    });
    ids.set(code, permission.id);
  }

  return ids;
}

async function replaceRolePermissions(
  roleId: string,
  codes: readonly PermissionCode[],
  permissionIds: ReadonlyMap<PermissionCode, string>,
): Promise<void> {
  await prisma.rolePermission.deleteMany({ where: { roleId } });

  if (codes.length === 0) {
    return;
  }

  await prisma.rolePermission.createMany({
    data: codes.map((code) => {
      const permissionId = permissionIds.get(code);
      if (permissionId === undefined) {
        throw new Error(`Permission ${code} was not seeded.`);
      }

      return { roleId, permissionId };
    }),
  });
}

async function seedSystemRoleTemplates(
  permissionIds: ReadonlyMap<PermissionCode, string>,
): Promise<void> {
  for (const template of SYSTEM_ROLE_TEMPLATES) {
    const existing = await prisma.role.findFirst({
      where: {
        libraryId: null,
        code: template.code,
      },
    });

    const role =
      existing === null
        ? await prisma.role.create({
            data: {
              libraryId: null,
              name: template.name,
              code: template.code,
              isSystem: true,
            },
          })
        : await prisma.role.update({
            where: { id: existing.id },
            data: {
              name: template.name,
              isSystem: true,
            },
          });

    await replaceRolePermissions(role.id, template.permissions, permissionIds);
  }
}

async function seedDemoTenant(permissionIds: ReadonlyMap<PermissionCode, string>): Promise<void> {
  const library = await prisma.library.upsert({
    where: { slug: 'demo-library' },
    update: {
      name: 'Демо-библиотека «Читай!»',
      email: 'library@demo.chitay.local',
      phone: '+7 000 000-00-00',
      address: 'Демонстрационный адрес',
      status: 'ACTIVE',
    },
    create: {
      name: 'Демо-библиотека «Читай!»',
      slug: 'demo-library',
      email: 'library@demo.chitay.local',
      phone: '+7 000 000-00-00',
      address: 'Демонстрационный адрес',
      status: 'ACTIVE',
    },
  });

  const branches = [
    {
      name: 'Центральный филиал',
      address: 'Демонстрационный адрес, 1',
      phone: '+7 000 000-00-01',
      email: 'central@demo.chitay.local',
    },
    {
      name: 'Филиал № 1',
      address: 'Демонстрационный адрес, 2',
      phone: '+7 000 000-00-02',
      email: 'branch1@demo.chitay.local',
    },
  ] as const;

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: {
        libraryId_name: {
          libraryId: library.id,
          name: branch.name,
        },
      },
      update: {
        address: branch.address,
        phone: branch.phone,
        email: branch.email,
        isActive: true,
      },
      create: {
        libraryId: library.id,
        ...branch,
        isActive: true,
      },
    });
  }

  await prisma.librarySettings.upsert({
    where: { libraryId: library.id },
    update: {
      timezone: 'Europe/Moscow',
      defaultLocale: 'ru-RU',
    },
    create: {
      libraryId: library.id,
      timezone: 'Europe/Moscow',
      defaultLocale: 'ru-RU',
    },
  });

  const defaultRule = await prisma.circulationRule.findFirst({
    where: {
      libraryId: library.id,
      branchId: null,
    },
  });

  const circulationRuleData = {
    readerType: null,
    defaultLoanDays: 14,
    maxBooksPerReader: 5,
    maxRenewals: 2,
    reservationHoldDays: 3,
    blockOnOverdue: true,
    allowReservations: true,
    allowRenewals: true,
  } as const;

  if (defaultRule === null) {
    await prisma.circulationRule.create({
      data: {
        libraryId: library.id,
        branchId: null,
        ...circulationRuleData,
      },
    });
  } else {
    await prisma.circulationRule.update({
      where: { id: defaultRule.id },
      data: circulationRuleData,
    });
  }

  const adminTemplate = SYSTEM_ROLE_TEMPLATES.find((template) => template.code === 'ADMIN');
  if (adminTemplate === undefined) {
    throw new Error('ADMIN system role template is missing.');
  }

  const adminRole = await prisma.role.upsert({
    where: {
      libraryId_code: {
        libraryId: library.id,
        code: adminTemplate.code,
      },
    },
    update: {
      name: adminTemplate.name,
      isSystem: false,
    },
    create: {
      libraryId: library.id,
      name: adminTemplate.name,
      code: adminTemplate.code,
      isSystem: false,
    },
  });

  await replaceRolePermissions(adminRole.id, adminTemplate.permissions, permissionIds);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.chitay.local' },
    update: {
      libraryId: library.id,
      firstName: 'Демо',
      lastName: 'Администратор',
      middleName: null,
      phone: null,
      status: 'ACTIVE',
      passwordHash: demoAdminPasswordHash,
    },
    create: {
      libraryId: library.id,
      email: 'admin@demo.chitay.local',
      passwordHash: demoAdminPasswordHash,
      firstName: 'Демо',
      lastName: 'Администратор',
      middleName: null,
      phone: null,
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });
}

async function main(): Promise<void> {
  const permissionIds = await seedPermissions();
  await seedSystemRoleTemplates(permissionIds);
  await seedDemoTenant(permissionIds);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
