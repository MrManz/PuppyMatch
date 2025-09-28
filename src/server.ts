// src/server.ts
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import dotenv from "dotenv";
import { createAuthRouter, requireAuth } from "./auth.js";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// --- DB setup ---
const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * Ensure the DB schema exists.
 * If you already have an ensureSchema in ./db.ts, import and call that instead.
 */
async function ensureSchema() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_interests (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      interests TEXT[] NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

// --- App setup ---
const app = express();

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

// 🔎 Boot logs
console.log("🚀 Server starting…");
console.log("   PORT:", PORT);
console.log("   CORS origin:", CORS_ORIGIN);
console.log("   DATABASE_URL:", DATABASE_URL);

// 🔎 Request logs (only for /users/me/*)
app.use((req, _res, next) => {
  if (req.path.startsWith("/users/me")) {
    // req.userId is set by requireAuth; may be undefined before it runs
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} userId=${req.userId}`);
  }
  next();
});

// Health + meta
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.send("PuppyMatch API is running"));

// Auth routes
app.use("/auth", createAuthRouter(pool));

// Protected interests endpoints
app.get("/users/me/interests", requireAuth, async (req, res) => {
  try {
    // Guard: ensure token's user exists in this DB (useful if envs changed)
    const u = await pool.query("SELECT 1 FROM users WHERE id = $1", [req.userId]);
    if (u.rowCount === 0) {
      return res.status(401).json({ error: "user_not_found_for_token" });
    }

    const { rows } = await pool.query<{ interests: string[] }>(
      "SELECT interests FROM user_interests WHERE user_id = $1",
      [req.userId]
    );
    res.json(rows[0]?.interests ?? []);
  } catch (e) {
    console.error("get_interests_failed:", e);
    res.status(500).json({ error: "get_interests_failed" });
  }
});

app.put("/users/me/interests", requireAuth, async (req, res) => {
  try {
    // Guard: ensure token's user exists in this DB
    const u = await pool.query("SELECT 1 FROM users WHERE id = $1", [req.userId]);
    if (u.rowCount === 0) {
      return res.status(401).json({ error: "user_not_found_for_token" });
    }

    const interests = Array.isArray(req.body?.interests)
      ? req.body.interests.map((s: unknown) => String(s))
      : [];

    await pool.query(
      `
      INSERT INTO user_interests (user_id, interests, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (user_id)
      DO UPDATE SET interests = EXCLUDED.interests, updated_at = now()
      `,
      [req.userId, interests]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error("put_interests_failed:", e);
    res.status(500).json({ error: "put_interests_failed" });
  }
});

// Start
(async () => {
  try {
    await ensureSchema();
    app.listen(PORT, () => {
      console.log(`✅ API ready at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
