import api from './api';

export interface AuthUser {
  userId: string;
  organizationId: string;
  role: string;
  email: string;
}

export async function login(email: string, password: string): Promise<void> {
  const res = await api.post<{ data: { token: string } }>('/auth/admin/login', {
    email,
    password,
  });
  localStorage.setItem('tf_token', res.data.data.token);
}

export function logout(): void {
  localStorage.removeItem('tf_token');
}

export function getToken(): string | null {
  return localStorage.getItem('tf_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/** Decode the JWT payload (no verification — trust is established server-side). */
function decodeToken(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function getRole(): string | null {
  const token = getToken();
  if (!token) return null;
  return (decodeToken(token)?.role as string) ?? null;
}
