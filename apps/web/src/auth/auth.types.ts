export type AuthUser = Readonly<{
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

export type AuthResponse = Readonly<{
  accessToken: string;
  expiresInSeconds: number;
  user: AuthUser;
}>;
