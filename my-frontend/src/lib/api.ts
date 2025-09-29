// src/lib/api.ts

/**
 * This module centralizes API calls and auth token handling.
 * It assumes the backend issues JWTs at /auth/login and /auth/register.
 */

export type StoredUser = { id: string; email: string };

// ----------------------
// Config
// ----------------------
const BASE: string =
  (import.meta.env.VITE_API_BASE as string) ||
  "http://localhost:3000"; // fallback for local dev

// ----------------------
// Local storage helpers
// ----------------------
export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getUser(): StoredUser | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// ----------------------
// Internal helper: handle API errors
// ----------------------
async function handleError(res: Response, defaultMsg: string): Promise<never> {
  let msg = defaultMsg;
  try {
    const data = await res.json();
    if (data?.message) msg = data.message;
  } catch {
    /* ignore parse errors */
  }
  throw new Error(msg);
}

function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ----------------------
// Auth endpoints
// ----------------------
export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) await handleError(res, "Login failed");

  const data = await res.json();
  if (data?.token) localStorage.setItem("token", data.token);
  if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));
  return data as { token: string; user: StoredUser };
}

export async function apiRegister(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) await handleError(res, "Registration failed");

  const data = await res.json();
  if (data?.token) localStorage.setItem("token", data.token);
  if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));
  return data as { token: string; user: StoredUser };
}

// ----------------------
// Interests endpoints
// ----------------------
export async function apiGetInterests(): Promise<string[]> {
  const res = await fetch(`${BASE}/users/me/interests`, {
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  if (!res.ok) await handleError(res, "Failed to fetch interests");
  return res.json();
}

export async function apiPutInterests(interests: string[]) {
  const res = await fetch(`${BASE}/users/me/interests`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ interests }),
  });
  if (!res.ok) await handleError(res, "Failed to save interests");
  return res.json();
}

// ----------------------
// Logout
// ----------------------
export function logout() {
  clearAuth();
  // Reload app state — App.tsx will show AuthPage again
  window.location.replace("/");
}
