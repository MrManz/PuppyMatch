// src/lib/api.ts

// Detect backend base URL
export const API_BASE: string =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  (typeof window !== "undefined" && (window as any).__API_BASE__) ||
  "http://localhost:3000";

// GET /users/:userId/interests -> { userId, interests: string[] }
export async function apiGetInterests(userId: string): Promise<string[]> {
  const r = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/interests`);
  if (!r.ok) throw new Error(`GET interests failed: ${r.status}`);
  const data = await r.json();
  return Array.isArray(data?.interests) ? data.interests : [];
}

// PUT /users/:userId/interests -> { userId, saved: number }
export async function apiPutInterests(userId: string, interests: string[]): Promise<number> {
  const r = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/interests`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interests }),
  });
  if (!r.ok) throw new Error(`PUT interests failed: ${r.status}`);
  const data = await r.json();
  return Number(data?.saved ?? 0);
}
