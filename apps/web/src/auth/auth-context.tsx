import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AuthApiError,
  currentUserRequest,
  loginRequest,
  logoutAllRequest,
  logoutRequest,
  refreshRequest,
} from './auth-api';
import type { AuthUser } from './auth.types';

type AuthStatus = 'bootstrapping' | 'authenticated' | 'anonymous';

type AuthContextValue = Readonly<{
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  logoutAll(): Promise<void>;
  refresh(): Promise<string | null>;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const bootstrapStarted = useRef(false);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    try {
      const refreshed = await refreshRequest();
      const currentUser = await currentUserRequest(refreshed.accessToken);
      setAccessToken(refreshed.accessToken);
      setUser(currentUser);
      setStatus('authenticated');
      return refreshed.accessToken;
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 401) {
        clearSession();
        return null;
      }
      clearSession();
      return null;
    }
  }, [clearSession]);

  useEffect(() => {
    if (bootstrapStarted.current) return;
    bootstrapStarted.current = true;
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const result = await loginRequest(email, password);
    setAccessToken(result.accessToken);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const logoutAll = useCallback(async (): Promise<void> => {
    try {
      if (accessToken !== null) await logoutAllRequest(accessToken);
    } finally {
      clearSession();
    }
  }, [accessToken, clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, accessToken, login, logout, logoutAll, refresh }),
    [status, user, accessToken, login, logout, logoutAll, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
