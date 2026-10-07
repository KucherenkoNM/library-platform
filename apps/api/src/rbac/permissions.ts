export const PERMISSIONS = [
  'BOOK_VIEW',
  'BOOK_CREATE',
  'BOOK_EDIT',
  'COPY_CREATE',
  'COPY_EDIT',
  'COPY_WRITE_OFF',
  'READER_VIEW',
  'READER_CREATE',
  'READER_EDIT',
  'READER_BLOCK',
  'LOAN_CREATE',
  'LOAN_RETURN',
  'LOAN_RENEW',
  'RESERVATION_MANAGE',
  'INVENTORY_MANAGE',
  'EMPLOYEE_MANAGE',
  'ROLE_MANAGE',
  'ANALYTICS_VIEW',
  'AUDIT_VIEW',
  'SETTINGS_EDIT',
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number];

const permissionCodeSet = new Set<string>(PERMISSIONS);

export function isPermissionCode(value: string): value is PermissionCode {
  return permissionCodeSet.has(value);
}
