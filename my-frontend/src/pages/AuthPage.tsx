// src/pages/AuthPage.tsx
import { useState } from "react";
import { apiLogin, apiRegister } from "../lib/api";

export default function AuthPage({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // required in register mode
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setError(null);          // clear error when switching (requested)
    setPassword("");         // optional: clear password on switch
    if (next === "login") setUsername(""); // username not used in login
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const em = email.trim().toLowerCase();
    const un = username.trim();

    try {
      if (mode === "login") {
        await apiLogin(em, password);
      } else {
        if (!un) throw new Error("Please choose a username.");
        // username must be unique & 3+ chars (backend enforces too)
        await apiRegister(em, password, un);
      }
      onAuthed();
    } catch (err: any) {
      // Show readable messages (401, 400, etc. are already mapped in api.ts handleError)
      const msg = err?.message || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white shadow p-6">
        <h1 className="text-xl font-semibold mb-1">
          {mode === "login" ? "Log in" : "Create your account"}
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          {mode === "login"
            ? "Welcome back! Enter your email and password."
            : "Pick a unique username, plus your email and password."}
        </p>

        {error && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                minLength={3}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your_name"
              />
              <p className="mt-1 text-xs text-gray-500">
                3–24 characters. Letters, numbers, underscores.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
            {mode === "register" && (
              <p className="mt-1 text-xs text-gray-500">At least 6 characters.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (mode === "login" ? "Logging in…" : "Creating account…") : (mode === "login" ? "Log in" : "Create account")}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === "login" ? (
            <>
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="text-blue-600 hover:underline"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-blue-600 hover:underline"
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
