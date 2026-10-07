import { Body, Controller, Get, Headers, HttpCode, Ip, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { ApiEnv } from '../config/env.js';
import { REFRESH_COOKIE_PATH } from './auth.constants.js';
import { loginSchema } from './auth.schemas.js';
import { AuthRateLimitService } from './auth-rate-limit.service.js';
import { AuthService } from './auth.service.js';
import { readCookie } from './cookie.js';
import { Public } from './public.decorator.js';
import type { AuthenticatedRequest } from './request-user.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieName: string;
  private readonly cookieSecure: boolean;
  private readonly refreshTtlDays: number;

  constructor(
    private readonly auth: AuthService,
    private readonly rateLimit: AuthRateLimitService,
    config: ConfigService<ApiEnv, true>,
  ) {
    this.cookieName = config.get('AUTH_REFRESH_COOKIE_NAME', { infer: true });
    this.cookieSecure = config.get('AUTH_COOKIE_SECURE', { infer: true });
    this.refreshTtlDays = config.get('AUTH_REFRESH_TOKEN_TTL_DAYS', { infer: true });
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate an employee and create a refresh session.' })
  async login(
    @Body() body: unknown,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) throw new UnauthorizedException('Invalid email or password.');

    await this.rateLimit.consumeLogin(ip || 'unknown', parsed.data.email);
    const result = await this.auth.login(parsed.data.email, parsed.data.password, {
      ipAddress: ip || null,
      userAgent: userAgent ?? null,
    });
    this.setRefreshCookie(response, result.refreshToken);
    return {
      accessToken: result.accessToken,
      expiresInSeconds: result.expiresInSeconds,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token.' })
  async refresh(
    @Req() request: Request,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rawToken = readCookie(request.headers.cookie, this.cookieName);
    if (rawToken === null) throw new UnauthorizedException('Refresh token required.');

    const result = await this.auth.refresh(rawToken, {
      ipAddress: ip || null,
      userAgent: userAgent ?? null,
    });
    this.setRefreshCookie(response, result.refreshToken);
    return {
      accessToken: result.accessToken,
      expiresInSeconds: result.expiresInSeconds,
      user: result.user,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke the current refresh session.' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.logout(readCookie(request.headers.cookie, this.cookieName));
    this.clearRefreshCookie(response);
  }

  @Post('logout-all')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke every refresh session for the authenticated employee.' })
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const claims = request.auth;
    if (claims === undefined) throw new UnauthorizedException('Authentication required.');
    await this.auth.logoutAll(claims.sub, claims.libraryId);
    this.clearRefreshCookie(response);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the current authenticated employee.' })
  me(@Req() request: AuthenticatedRequest) {
    const claims = request.auth;
    if (claims === undefined) throw new UnauthorizedException('Authentication required.');
    return this.auth.currentUser(claims.sub, claims.libraryId);
  }

  private setRefreshCookie(response: Response, token: string): void {
    response.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: this.refreshTtlDays * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(this.cookieName, {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    });
  }
}
