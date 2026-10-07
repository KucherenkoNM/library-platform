import { webEnv } from '../config/env';
import type { AuthResponse, AuthUser } from './auth.types';

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new AuthApiError(
      response.status === 401 ? 'Неверный email или пароль.' : 'Не удалось выполнить запрос.',
      response.status,
    );
  }
  return (await response.json()) as T;
}

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${webEnv.VITE_API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return readJson<AuthResponse>(response);
}

export async function refreshRequest(): Promise<AuthResponse> {
  const response = await fetch(`${webEnv.VITE_API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  return readJson<AuthResponse>(response);
}

export async function currentUserRequest(accessToken: string): Promise<AuthUser> {
  const response = await fetch(`${webEnv.VITE_API_URL}/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
    credentials: 'include',
  });
  return readJson<AuthUser>(response);
}

export async function logoutRequest(): Promise<void> {
  await fetch(`${webEnv.VITE_API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function logoutAllRequest(accessToken: string): Promise<void> {
  await fetch(`${webEnv.VITE_API_URL}/auth/logout-all`, {
    method: 'POST',
    credentials: 'include',
    headers: { authorization: `Bearer ${accessToken}` },
  });
}
