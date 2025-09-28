// src/lib/auth.ts
const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  (typeof window !== "undefined" && (window as any).__API_BASE__) ||
  "http://localhost:3000";

const LS_TOKEN = "auth_token_v1";
const LS_USER  = "auth_user_v1";

export type User = { id: string; email: string };

export function saveAuth(token: string, user: User) {
  localStorage.setItem(LS_TOKEN, token);
  localStorage.setItem(LS_USER, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
}

export function getToken(): string | null {
  return localStorage.getItem(LS_TOKEN);
}

export function getUser(): User | null {
  const raw = localStorage.getItem(LS_USER);
  return raw ? JSON.parse(raw) : null;
}

export async function login(email: string, password: string) {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`Login failed: ${r.status}`);
  return r.json() as Promise<{ token: string; user: User }>;
}

export async function register(email: string, password: string) {
  const r = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`Register failed: ${r.status}`);
  return r.json() as Promise<{ token: string; user: User }>;
}

export function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
