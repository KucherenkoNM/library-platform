export type AccessTokenClaims = Readonly<{
  sub: string;
  libraryId: string;
  sessionId: string;
  type: 'access';
}>;

export type AuthenticatedUser = Readonly<{
  id: string;
  libraryId: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  status: string;
  library: Readonly<{
    id: string;
    name: string;
    slug: string;
  }>;
  permissions: readonly string[];
}>;

export type AuthResult = Readonly<{
  accessToken: string;
  expiresInSeconds: number;
  user: AuthenticatedUser;
}>;

export type AuthRequestMeta = Readonly<{
  ipAddress: string | null;
  userAgent: string | null;
}>;
