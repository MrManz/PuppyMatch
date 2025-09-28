import React, { useState } from "react";
import { login, register, saveAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export default function AuthPage({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { token, user } =
        mode === "login" ? await login(email, password) : await register(email, password);
      saveAuth(token, user);
      onAuthed();
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-blue-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "login" ? "Welcome back" : "Create account"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
            </Button>
          </form>
          <div className="mt-3 text-sm text-center">
            {mode === "login" ? (
              <button className="underline" onClick={() => setMode("register")}>
                New here? Create an account
              </button>
            ) : (
              <button className="underline" onClick={() => setMode("login")}>
                Have an account? Log in
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
