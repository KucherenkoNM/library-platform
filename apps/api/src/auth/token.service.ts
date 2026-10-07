import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, SignJWT } from 'jose';
import type { ApiEnv } from '../config/env.js';
import { ACCESS_TOKEN_TYPE, REFRESH_TOKEN_BYTES } from './auth.constants.js';
import type { AccessTokenClaims } from './auth.types.js';

@Injectable()
export class TokenService {
  private readonly accessSecret: Uint8Array;
  private readonly issuer: string;
  private readonly audience: string;
  readonly accessTtlSeconds: number;
  readonly refreshTtlDays: number;

  constructor(config: ConfigService<ApiEnv, true>) {
    this.accessSecret = new TextEncoder().encode(config.get('AUTH_ACCESS_TOKEN_SECRET', { infer: true }));
    this.issuer = config.get('AUTH_TOKEN_ISSUER', { infer: true });
    this.audience = config.get('AUTH_TOKEN_AUDIENCE', { infer: true });
    this.accessTtlSeconds = config.get('AUTH_ACCESS_TOKEN_TTL_SECONDS', { infer: true });
    this.refreshTtlDays = config.get('AUTH_REFRESH_TOKEN_TTL_DAYS', { infer: true });
  }

  async signAccessToken(input: {
    userId: string;
    libraryId: string;
    sessionId: string;
  }): Promise<string> {
    return new SignJWT({
      libraryId: input.libraryId,
      sessionId: input.sessionId,
      type: ACCESS_TOKEN_TYPE,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(input.userId)
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setIssuedAt()
      .setExpirationTime(`${this.accessTtlSeconds}s`)
      .sign(this.accessSecret);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.accessSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256'],
      });

      if (
        typeof payload.sub !== 'string' ||
        typeof payload.libraryId !== 'string' ||
        typeof payload.sessionId !== 'string' ||
        payload.type !== ACCESS_TOKEN_TYPE
      ) {
        throw new UnauthorizedException('Invalid access token.');
      }

      return {
        sub: payload.sub,
        libraryId: payload.libraryId,
        sessionId: payload.sessionId,
        type: ACCESS_TOKEN_TYPE,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }

  createRefreshToken(): { rawToken: string; tokenHash: string; familyId: string; expiresAt: Date } {
    const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const tokenHash = this.hashRefreshToken(rawToken);
    const expiresAt = new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
    return { rawToken, tokenHash, familyId: randomUUID(), expiresAt };
  }

  rotateRefreshToken(familyId: string): { rawToken: string; tokenHash: string; familyId: string; expiresAt: Date } {
    const next = this.createRefreshToken();
    return { ...next, familyId };
  }

  hashRefreshToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
