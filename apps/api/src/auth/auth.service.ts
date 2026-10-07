import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PermissionResolverService } from '../rbac/permission-resolver.service.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import type { AuthRequestMeta, AuthResult, AuthenticatedUser } from './auth.types.js';

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$Pv06GJTA2S1R5jfp60HrpQ$agXnXGGH2n9w6fYlf8t+2lLQbD02NRbsUMf1NOMW7h0';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly permissions: PermissionResolverService,
  ) {}

  async login(email: string, password: string, meta: AuthRequestMeta): Promise<AuthResult & { refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { library: true },
    });

    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const validPassword = await this.passwords.verify(passwordHash, password).catch(() => false);

    if (
      user === null ||
      !validPassword ||
      user.status !== 'ACTIVE' ||
      user.library.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const refresh = this.tokens.createRefreshToken();
    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.authSession.create({
        data: {
          libraryId: user.libraryId,
          userId: user.id,
          familyId: refresh.familyId,
          tokenHash: refresh.tokenHash,
          expiresAt: refresh.expiresAt,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });
      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      return created;
    });

    const accessToken = await this.tokens.signAccessToken({
      userId: user.id,
      libraryId: user.libraryId,
      sessionId: session.id,
    });

    return {
      accessToken,
      expiresInSeconds: this.tokens.accessTtlSeconds,
      refreshToken: refresh.rawToken,
      user: await this.toAuthenticatedUser(user.id, user.libraryId),
    };
  }

  async refresh(rawToken: string, meta: AuthRequestMeta): Promise<AuthResult & { refreshToken: string }> {
    const tokenHash = this.tokens.hashRefreshToken(rawToken);
    const session = await this.prisma.authSession.findUnique({ where: { tokenHash } });

    if (session === null) throw new UnauthorizedException('Invalid refresh token.');

    if (session.revokedAt !== null) {
      await this.revokeFamily(session.familyId, 'refresh_token_reuse_detected');
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), revokeReason: 'expired' },
      });
      throw new UnauthorizedException('Refresh token expired.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: session.userId, libraryId: session.libraryId },
      include: { library: true },
    });
    if (user === null || user.status !== 'ACTIVE' || user.library.status !== 'ACTIVE') {
      await this.revokeFamily(session.familyId, 'principal_inactive');
      throw new UnauthorizedException('Session is no longer valid.');
    }

    const next = this.tokens.rotateRefreshToken(session.familyId);
    const nextSession = await this.prisma.$transaction(async (tx) => {
      const created = await tx.authSession.create({
        data: {
          libraryId: session.libraryId,
          userId: session.userId,
          familyId: session.familyId,
          tokenHash: next.tokenHash,
          expiresAt: next.expiresAt,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });
      const updated = await tx.authSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokeReason: 'rotated',
          replacedBySessionId: created.id,
          lastUsedAt: new Date(),
        },
      });
      if (updated.count !== 1) throw new UnauthorizedException('Refresh token already used.');
      return created;
    });

    const accessToken = await this.tokens.signAccessToken({
      userId: user.id,
      libraryId: user.libraryId,
      sessionId: nextSession.id,
    });

    return {
      accessToken,
      expiresInSeconds: this.tokens.accessTtlSeconds,
      refreshToken: next.rawToken,
      user: await this.toAuthenticatedUser(user.id, user.libraryId),
    };
  }

  async logout(rawToken: string | null): Promise<void> {
    if (rawToken === null) return;
    const tokenHash = this.tokens.hashRefreshToken(rawToken);
    await this.prisma.authSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: 'logout' },
    });
  }

  async logoutAll(userId: string, libraryId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, libraryId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: 'logout_all' },
    });
  }

  async currentUser(userId: string, libraryId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, libraryId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (user === null) throw new UnauthorizedException('Authenticated user is unavailable.');
    return this.toAuthenticatedUser(userId, libraryId);
  }

  private async revokeFamily(familyId: string, reason: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  private async toAuthenticatedUser(userId: string, libraryId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, libraryId },
      include: { library: true },
    });
    const permissionCodes = [...(await this.permissions.resolveForUser({ userId, libraryId }))].sort();
    return {
      id: user.id,
      libraryId: user.libraryId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      status: user.status,
      library: { id: user.library.id, name: user.library.name, slug: user.library.slug },
      permissions: permissionCodes,
    };
  }
}
