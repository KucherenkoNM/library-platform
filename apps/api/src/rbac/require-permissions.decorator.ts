import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from './permissions.js';

export const REQUIRED_PERMISSIONS_KEY = 'chitay:required-permissions';

export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
