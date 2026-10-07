import { Module } from '@nestjs/common';
import { PermissionGuard } from './permission.guard.js';
import { PermissionResolverService } from './permission-resolver.service.js';

@Module({
  providers: [PermissionResolverService, PermissionGuard],
  exports: [PermissionResolverService, PermissionGuard],
})
export class RbacModule {}
