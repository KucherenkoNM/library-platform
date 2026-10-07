import { PERMISSIONS, type PermissionCode } from './permissions.js';

export type SystemRoleTemplate = Readonly<{
  code: string;
  name: string;
  permissions: readonly PermissionCode[];
}>;

export const SYSTEM_ROLE_TEMPLATES: readonly SystemRoleTemplate[] = [
  {
    code: 'ADMIN',
    name: 'Администратор',
    permissions: PERMISSIONS,
  },
  {
    code: 'LIBRARIAN',
    name: 'Библиотекарь',
    permissions: [
      'BOOK_VIEW',
      'COPY_EDIT',
      'READER_VIEW',
      'READER_CREATE',
      'READER_EDIT',
      'READER_BLOCK',
      'LOAN_CREATE',
      'LOAN_RETURN',
      'LOAN_RENEW',
      'RESERVATION_MANAGE',
    ],
  },
  {
    code: 'CATALOGER',
    name: 'Каталогизатор',
    permissions: [
      'BOOK_VIEW',
      'BOOK_CREATE',
      'BOOK_EDIT',
      'COPY_CREATE',
      'COPY_EDIT',
      'COPY_WRITE_OFF',
      'INVENTORY_MANAGE',
    ],
  },
  {
    code: 'MANAGER',
    name: 'Руководитель',
    permissions: ['BOOK_VIEW', 'ANALYTICS_VIEW', 'AUDIT_VIEW'],
  },
] as const;
