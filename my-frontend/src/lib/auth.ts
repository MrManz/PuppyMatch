// src/lib/auth.ts

/**
 * Helpers for managing auth token on the frontend.
 * Uses localStorage to persist the JWT.
 */

const TOKEN_KEY = "puppymatch_token";

/**
 * Save a token (JWT).
 */
export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore storage errors (Safari private mode, etc.)
  }
}

/**
 * Get the current token (JWT) from storage.
 */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Remove token from storage.
 */
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Build Authorization header if token exists.
 */
export function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
