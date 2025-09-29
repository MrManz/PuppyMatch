// src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";

import { createAuthRouter, requireAuth } from "./auth.js";
import { z } from "zod";

// Inline schema (avoids CJS/ESM interop issues)
const interestsSchema = z.object({
  interests: z
    .array(
      z
        .string()
        .transform((s: string) => s.trim())
        .pipe(z.string().min(1, "Interest can’t be empty").max(64, "Interest is too long"))
    )
    .max(500, "Too many interests"),
});

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL!;
const NODE_ENV = process.env.NODE_ENV || "development";

// -----------------
// Database (SSL aware)
// -----------------
const sslMode =
  process.env.PGSSLMODE ??
  (NODE_ENV === "production" ? "require" : "disable");

let ssl: false | { rejectUnauthorized: boolean; ca?: string } = false;
if (sslMode === "require") {
  ssl = process.env.DATABASE_CA
    ? { ca: process.env.DATABASE_CA, rejectUnauthorized: true }
    : { rejectUnauthorized: false };
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl,
});

// -----------------
// App setup
// -----------------
const app = express();
app.use(express.json());

// CORS allowlist (local + deployed frontend). You can also set CORS_ORIGINS env as CSV.
const ALLOWED_ORIGINS =
  (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length > 0
    ? (process.env.CORS_ORIGINS as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : ["http://localhost:5173", "https://puppymatch-frontend.onrender.com"];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // allow server-to-server / curl
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// -----------------
// Schema ensure
// -----------------
async function ensureSchema() {
  // If pgcrypto isn't available in your managed DB, remove the extension line and
  // change id generation to uuid_generate_v4() if that extension exists, or use app-side UUIDs.
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

// -----------------
// Routes
// -----------------
app.use("/auth", createAuthRouter(pool));

app.get("/users/me/interests", requireAuth, async (req, res) => {
  try {
    // Optional: ensure token’s user exists (helps when DB/env changed)
    const u = await pool.query("SELECT 1 FROM users WHERE id = $1", [req.userId]);
    if (u.rowCount === 0) {
      return res.status(401).json({
        error: "user_not_found_for_token",
        message: "Your session is no longer valid. Please log in again.",
      });
    }

    const { rows } = await pool.query<{ interests: string[] }>(
      `SELECT interests FROM user_interests WHERE user_id = $1`,
      [req.userId]
    );
    res.json(rows[0]?.interests ?? []);
  } catch (e) {
    console.error("get_interests_failed:", e);
    res.status(500).json({ error: "get_interests_failed", message: "Could not load interests." });
  }
});

app.put("/users/me/interests", requireAuth, async (req, res) => {
  try {
    const parsed = interestsSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
      return res.status(400).json({
        error: "invalid_body",
        message: `${path}${issue.message}`,
      });
    }
    const { interests } = parsed.data;

    const u = await pool.query("SELECT 1 FROM users WHERE id = $1", [req.userId]);
    if (u.rowCount === 0) {
      return res.status(401).json({
        error: "user_not_found_for_token",
        message: "Your session is no longer valid. Please log in again.",
      });
    }

    await pool.query(
      `INSERT INTO user_interests (user_id, interests, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id)
       DO UPDATE SET interests = EXCLUDED.interests, updated_at = now()`,
      [req.userId, interests]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("put_interests_failed:", e);
    res.status(500).json({ error: "put_interests_failed", message: "Could not save interests." });
  }
});


// Health + root
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.send("PuppyMatch API is running"));

// -----------------
// Start server
// -----------------
ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log("🚀 Server ready");
      console.log("   PORT:", PORT);
      console.log("   NODE_ENV:", NODE_ENV);
      console.log("   PGSSLMODE:", sslMode);
      console.log(
        "   DATABASE_URL:",
        DATABASE_URL.replace(/:[^:@]+@/, ":*****@") // mask password
      );
      console.log("   CORS allowlist:", ALLOWED_ORIGINS.join(", "));
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
