import { authHeaders } from "./auth";

export const API_BASE: string =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  (typeof window !== "undefined" && (window as any).__API_BASE__) ||
  "http://localhost:3000";

export async function apiGetInterests(): Promise<string[]> {
  const r = await fetch(`${API_BASE}/users/me/interests`, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error(`GET interests failed: ${r.status}`);
  const data = await r.json();
  return Array.isArray(data?.interests) ? data.interests : [];
}

export async function apiPutInterests(interests: string[]): Promise<number> {
  const r = await fetch(`${API_BASE}/users/me/interests`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ interests }),
  });
  if (!r.ok) throw new Error(`PUT interests failed: ${r.status}`);
  const data = await r.json();
  return Number(data?.saved ?? 0);
}
