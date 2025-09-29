// src/pages/AuthPage.tsx
import { useEffect, useState } from "react";
import { apiLogin, apiRegister } from "../lib/api";

type Props = {
  onAuthed?: () => void; // optional callback after successful auth
};

export default function AuthPage({ onAuthed }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error when mode changes
  useEffect(() => {
    setError(null);
  }, [mode]);

  // Clear error when user edits inputs
  useEffect(() => {
    if (error) setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const fn = mode === "login" ? apiLogin : apiRegister;
      const res = await fn(email.trim(), password);
      if (res?.token) {
        if (onAuthed) onAuthed();
        else window.location.replace("/");
      } else {
        setError("Unexpected response from server.");
      }
    } catch (err: any) {
      setError(err?.message || (mode === "login" ? "Login failed" : "Registration failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center bg-gray-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow"
      >
        <h1 className="mb-1 text-xl font-semibold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mb-4 text-sm text-gray-600">
          {mode === "login"
            ? "Log in to manage your interests."
            : "Register to start saving your interests."}
        </p>

        {error && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="mb-2 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded border px-3 py-2 outline-none focus:ring"
          autoComplete="username"
          placeholder="you@example.com"
          required
        />

        <label className="mb-2 block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border px-3 py-2 outline-none focus:ring"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="••••••••"
          required
        />

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy
            ? mode === "login"
              ? "Logging in…"
              : "Creating account…"
            : mode === "login"
            ? "Log in"
            : "Register"}
        </button>

        <div className="mt-4 text-center text-sm">
          {mode === "login" ? (
            <>
              Don’t have an account?{" "}
              <button
                type="button"
                className="font-medium text-blue-700 hover:underline"
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="font-medium text-blue-700 hover:underline"
                onClick={() => setMode("login")}
              >
                Log in
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
