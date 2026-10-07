import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantContextService } from '../tenancy/tenant-context.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import type { AuthenticatedRequest } from './request-user.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (authorization === undefined || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required.');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (token.length === 0) throw new UnauthorizedException('Authentication required.');

    const claims = await this.tokens.verifyAccessToken(token);
    const session = await this.prisma.authSession.findFirst({
      where: {
        id: claims.sessionId,
        userId: claims.sub,
        libraryId: claims.libraryId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { status: 'ACTIVE' },
        library: { status: 'ACTIVE' },
      },
      select: { id: true },
    });
    if (session === null) throw new UnauthorizedException('Session is no longer valid.');

    request.auth = claims;
    this.tenantContext.setPrincipal({ userId: claims.sub, libraryId: claims.libraryId });
    return true;
  }
}
