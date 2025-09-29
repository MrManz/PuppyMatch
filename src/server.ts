// src/server.ts
import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { Pool } from "pg";
import { z } from "zod";

import { createAuthRouter, requireAuth } from "./auth.js";
import { makeCors, ensureCorsHeaders } from "./corsConfig.js";

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

// CORS FIRST
app.use(makeCors());
app.use(ensureCorsHeaders);
app.options("*", makeCors());

// JSON body (allow avatars as data URLs)
app.use(express.json({ limit: "3mb" }));

// Friendly 413 handler
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err?.type === "entity.too.large") {
    return res
      .status(413)
      .json({ error: "payload_too_large", message: "Image is too large. Please pick a smaller one." });
  }
  next(err);
});

// -----------------
// Schema ensure
// -----------------
async function ensureSchema() {
  // Try to enable pgcrypto for gen_random_uuid(); ignore if not permitted.
  await pool.query(`
    DO $$
    BEGIN
      BEGIN
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'pgcrypto extension not installed (insufficient privilege)';
      END;
    END$$;
  `);

  // Users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Profile fields (idempotent)
  await pool.query(`
    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS username         TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS avatar_url       TEXT,
      ADD COLUMN IF NOT EXISTS telegram_handle  TEXT;
  `);

  // Interests
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.user_interests (
      user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
      interests TEXT[] NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

// -----------------
// Validation schemas
// -----------------
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

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username must be at most 24 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores are allowed");

const telegramHandleSchema = z
  .string()
  .regex(/^@[a-zA-Z0-9_]{5,32}$/, "Must start with @ and be 5–32 characters (letters, digits, underscores)");

const profilePutSchema = z.object({
  username: usernameSchema.optional(),
  // MVP: store a small data URL; for production, upload to object storage and save the public URL.
  avatarDataUrl: z.string().startsWith("data:image/", "Must be a data URL").max(2_000_000, "Image is too large").optional(),
  telegramHandle: telegramHandleSchema.optional(),
});

// -----------------
// Routes
// -----------------
app.use("/auth", createAuthRouter(pool));

/** Get my interests */
app.get("/users/me/interests", requireAuth, async (req: Request, res: Response) => {
  try {
    const u = await pool.query("SELECT 1 FROM public.users WHERE id = $1", [req.userId]);
    if (u.rowCount === 0) {
      return res.status(401).json({
        error: "user_not_found_for_token",
        message: "Your session is no longer valid. Please log in again.",
      });
    }

    const { rows } = await pool.query<{ interests: string[] }>(
      `SELECT interests FROM public.user_interests WHERE user_id = $1`,
      [req.userId]
    );
    res.json(rows[0]?.interests ?? []);
  } catch (e) {
    console.error("get_interests_failed:", e);
    res.status(500).json({ error: "get_interests_failed", message: "Could not load interests." });
  }
});

/** Update my interests */
app.put("/users/me/interests", requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = interestsSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
      return res.status(400).json({ error: "invalid_body", message: `${path}${issue.message}` });
    }

    const { interests } = parsed.data;
    const u = await pool.query("SELECT 1 FROM public.users WHERE id = $1", [req.userId]);
    if (u.rowCount === 0) {
      return res.status(401).json({
        error: "user_not_found_for_token",
        message: "Your session is no longer valid. Please log in again.",
      });
    }

    await pool.query(
      `INSERT INTO public.user_interests (user_id, interests, updated_at)
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

/** Matches: users with overlapping interests (returns username + avatar) */
app.get("/users/me/matches", requireAuth, async (req: Request, res: Response) => {
  try {
    const me = await pool.query<{ interests: string[] }>(
      `SELECT interests FROM public.user_interests WHERE user_id = $1`,
      [req.userId]
    );
    const myInterests = me.rows[0]?.interests ?? [];
    if (myInterests.length === 0) return res.json([]);

    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));

    // inside /users/me/matches route, replace the SELECT with this one
const { rows } = await pool.query<{
  id: string;
  username: string | null;
  avatar_url: string | null;
  telegram_handle: string | null;
  overlap: string;
  common: string[];
}>(
  `
  WITH my AS (
    SELECT $1::uuid AS user_id, $2::text[] AS interests
  )
  SELECT
    u.id,
    u.username,
    u.avatar_url,
    u.telegram_handle,
    COUNT(*)::int AS overlap,
    ARRAY_AGG(DISTINCT mi.i) AS common
  FROM public.user_interests ui
  JOIN public.users u ON u.id = ui.user_id
  JOIN my ON TRUE
  JOIN LATERAL unnest(ui.interests) AS ui_i(i) ON TRUE
  JOIN LATERAL unnest(my.interests) AS mi(i) ON ui_i.i = mi.i
  WHERE ui.user_id <> my.user_id
  GROUP BY u.id, u.username, u.avatar_url, u.telegram_handle
  HAVING COUNT(*) > 0
  ORDER BY overlap DESC, COALESCE(u.username, '') ASC
  LIMIT $3
  `,
  [req.userId, myInterests, limit]
);

const data = rows.map((r) => ({
  id: r.id,
  username: r.username,
  avatarUrl: r.avatar_url,
  telegramHandle: r.telegram_handle,   // 👈 add this
  overlap: Number(r.overlap),
  common: r.common ?? [],
}));

res.json(data);

  } catch (e) {
    console.error("get_matches_failed:", e);
    res.status(500).json({ error: "get_matches_failed", message: "Could not load matches." });
  }
});

/** Get my profile (email, username, avatarUrl, telegramHandle) */
app.get("/users/me/profile", requireAuth, async (req: Request, res: Response) => {
  try {
    const q = await pool.query<{
      id: string;
      email: string;
      username: string | null;
      avatar_url: string | null;
      telegram_handle: string | null;
    }>(
      `SELECT id, email, username, avatar_url, telegram_handle
       FROM public.users
       WHERE id = $1`,
      [req.userId]
    );

    if (q.rowCount === 0) {
      return res.status(401).json({
        error: "user_not_found_for_token",
        message: "Please log in again.",
      });
    }

    res.json({
      id: q.rows[0].id,
      email: q.rows[0].email,
      username: q.rows[0].username,
      avatarUrl: q.rows[0].avatar_url,
      telegramHandle: q.rows[0].telegram_handle,
    });
  } catch (e) {
    console.error("get_profile_failed:", e);
    res.status(500).json({ error: "get_profile_failed", message: "Could not load profile." });
  }
});

/** Update my profile (username + avatar data URL + telegram handle) — always returns user */
app.put("/users/me/profile", requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = profilePutSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
      return res.status(400).json({ error: "invalid_body", message: `${path}${issue.message}` });
    }
    const { username, avatarDataUrl, telegramHandle } = parsed.data;

    const updates: string[] = [];
    const params: any[] = [];
    let p = 1;

    if (typeof username !== "undefined") {
      updates.push(`username = $${p++}`);
      params.push(username);
    }
    if (typeof avatarDataUrl !== "undefined") {
      updates.push(`avatar_url = $${p++}`);
      params.push(avatarDataUrl);
    }
    if (typeof telegramHandle !== "undefined") {
      updates.push(`telegram_handle = $${p++}`);
      params.push(telegramHandle);
    }

    let row:
      | { id: string; email: string; username: string | null; avatar_url: string | null; telegram_handle: string | null }
      | undefined;

    if (updates.length > 0) {
      params.push(req.userId);
      const q = await pool.query(
        `UPDATE public.users
         SET ${updates.join(", ")}
         WHERE id = $${p}
         RETURNING id, email, username, avatar_url, telegram_handle`,
        params
      );
      row = q.rows[0];
    } else {
      // Nothing changed — still return the current user
      const q = await pool.query(
        `SELECT id, email, username, avatar_url, telegram_handle
         FROM public.users
         WHERE id = $1`,
        [req.userId]
      );
      row = q.rows[0];
    }

    if (!row) {
      return res.status(401).json({
        error: "user_not_found_for_token",
        message: "Please log in again.",
      });
    }

    return res.json({
      ok: true,
      user: {
        id: row.id,
        email: row.email,
        username: row.username,
        avatarUrl: row.avatar_url,
        telegramHandle: row.telegram_handle,
      },
    });
  } catch (e: any) {
    if (e?.code === "23505") {
      return res.status(409).json({
        error: "username_taken",
        message: "That username is already taken.",
      });
    }
    console.error("put_profile_failed:", e);
    res.status(500).json({ error: "put_profile_failed", message: "Could not update profile." });
  }
});

// Health + root
app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));
app.get("/", (_req: Request, res: Response) => res.send("PuppyMatch API is running"));

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
        DATABASE_URL.replace(/:[^:@]+@/, ":*****@")
      );
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
