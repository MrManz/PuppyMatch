// src/lib/api.ts

// ---- Base URL ---------------------------------------------------------------
const BASE: string =
  (window as any).__API_BASE__ ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:3000";

// ---- Local storage helpers --------------------------------------------------
export function getToken(): string | null {
  return localStorage.getItem("token");
}

export type StoredUser = { id?: string | number; email?: string; username?: string } | null;

export function getUser(): StoredUser {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout(redirect = true) {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  if (redirect) {
    window.location.href = "/login"; // or your auth route
  }
}


// ---- Internal: auth header + fetch wrapper ----------------------------------
function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * fetchWithAuth: centralized 401 handling.
 * - If response is 401, clear storage and redirect to /login immediately.
 * - Otherwise returns the Response for normal handling.
 */
async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    try {
      const data = await res.clone().json();
      if (data?.error === "user_not_found_for_token" || data?.error === "invalid_token") {
        // treat as unauthorized
      }
    } catch {
      // ignore parse errors, still treat as unauthorized
    }
    logout();
    setTimeout(() => (window.location.href = "/login"), 0);
    throw new Error("unauthorized");
  }
  return res;
}

// ---- Auth API ---------------------------------------------------------------
export async function apiLogin(usernameOrEmail: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: usernameOrEmail, password }),
  });

  if (!res.ok) {
    let msg = "Login failed";
    try {
      const data = await res.json();
      if (data?.message) msg = data.message; // 👈 use backend message
    } catch {
      // ignore parse errors
    }
    throw new Error(msg);
  }

  const data = await res.json();
  if (data?.token) localStorage.setItem("token", data.token);
  if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));
  return data as { token: string; user?: StoredUser };
}

export async function apiRegister(usernameOrEmail: string, password: string) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: usernameOrEmail, password }),
  });

  if (!res.ok) {
    let msg = "Registration failed";
    try {
      const data = await res.json();
      if (data?.message) msg = data.message; // 👈 use backend message
    } catch {
      // ignore parse errors
    }
    throw new Error(msg);
  }

  const data = await res.json();
  if (data?.token) localStorage.setItem("token", data.token);
  if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));
  return data as { token: string; user?: StoredUser };
}

// ---- Protected API ----------------------------------------------------------
export async function apiGetInterests(): Promise<string[]> {
  const res = await fetchWithAuth(`${BASE}/users/me/interests`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
  });
  if (!res.ok) throw new Error(`Fetch interests failed: ${res.status}`);
  return res.json();
}

export async function apiPutInterests(interests: string[]) {
  const res = await fetchWithAuth(`${BASE}/users/me/interests`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ interests }),
  });
  if (!res.ok) throw new Error(`Save interests failed: ${res.status}`);
  return res.json();
}
