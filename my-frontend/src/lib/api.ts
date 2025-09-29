// src/lib/api.ts

/**
 * Centralized API client + auth token management
 */

export type StoredUser = { id: string; email: string; username?: string | null; avatarUrl?: string | null };

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

export function setUser(u: StoredUser) {
  localStorage.setItem("user", JSON.stringify(u));
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// ----------------------
// Internal helpers
// ----------------------
function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  if (data?.user) setUser(data.user);
  return data as { token: string; user: StoredUser };
}

// src/lib/api.ts
export async function apiRegister(email: string, password: string, username: string) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, username }), // <- must include username
  });
  if (!res.ok) await handleError(res, "Registration failed");
  const data = await res.json();
  if (data?.token) localStorage.setItem("token", data.token);
  if (data?.user) setUser(data.user);
  return data;
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
// Matches endpoints
// ----------------------
export interface MatchUser {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  telegramHandle: string | null;
  overlap: number;
  common: string[];
}

export async function apiGetMatches(): Promise<MatchUser[]> {
  const res = await fetch(`${BASE}/users/me/matches`, {
    headers: { ...authHeader() },
  });
  if (!res.ok) await handleError(res, "Failed to fetch matches");
  return res.json();
}


// ----------------------
// Profile endpoints
// ----------------------
export type Profile = {
  id: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  telegramHandle: string | null;
};

export async function apiGetProfile(): Promise<Profile> {
  const res = await fetch(`${BASE}/users/me/profile`, {
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  if (!res.ok) await handleError(res, "Failed to load profile");
  return res.json();
}

export async function apiUpdateProfile(input: { username?: string; avatarDataUrl?: string }) {
  const res = await fetch(`${BASE}/users/me/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(input),
  });
  if (!res.ok) await handleError(res, "Failed to update profile");
  const data = (await res.json()) as { ok: true; user: Profile };
  // Optional: mirror the updated profile into localStorage user
  const existing = getUser();
  if (existing) {
    setUser({
      ...existing,
      username: data.user.username,
      avatarUrl: data.user.avatarUrl,
    });
  }
  return data;
}

// ----------------------
// Logout
// ----------------------
export function logout() {
  clearAuth();
  window.location.replace("/"); // reload → App.tsx will show AuthPage
}
