// src/lib/api.ts

/**
 * Base API URL.
 * - Uses VITE_API_BASE if provided
 * - Or window.__API_BASE__ (for runtime override)
 * - Defaults to http://localhost:3000
 */
const API_BASE: string =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  (typeof window !== "undefined" && (window as any).__API_BASE__) ||
  "http://localhost:3000";

/**
 * Read JWT token from localStorage
 */
function getToken(): string | null {
  return localStorage.getItem("token");
}

/**
 * Attach Authorization header if token exists
 */
function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Generic API fetch wrapper
 * - Adds Content-Type + Authorization
 * - Redirects to /login on 401
 */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (r.status === 401) {
    // redirect to login if unauthorized
    window.location.href = "/login";
    throw new Error("Unauthorized — redirecting to login");
  }

  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`API error ${r.status}: ${txt}`);
  }

  return r.json() as Promise<T>;
}

/**
 * Login user and store JWT
 */
export async function apiLogin(
  username: string,
  password: string
): Promise<{ token: string }> {
  const data = await apiFetch<{ token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem("token", data.token);
  return data;
}

/**
 * Register new user and store JWT
 */
export async function apiRegister(
  username: string,
  password: string
): Promise<{ token: string }> {
  const data = await apiFetch<{ token: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem("token", data.token);
  return data;
}

/**
 * Logout user (clear local storage)
 */
export function apiLogout(): void {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

/**
 * Get current user's interests
 */
export async function apiGetInterests(): Promise<string[]> {
  const data = await apiFetch<{ interests: string[] }>("/users/me/interests");
  return Array.isArray(data.interests) ? data.interests : [];
}

/**
 * Save current user's interests
 */
export async function apiPutInterests(interests: string[]): Promise<number> {
  const data = await apiFetch<{ saved: number }>("/users/me/interests", {
    method: "PUT",
    body: JSON.stringify({ interests }),
  });
  return data.saved;
}
