// src/auth.ts
import { Router, Request, Response, NextFunction } from "express";
import type { Pool } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/**
 * Request typing: we’ll attach userId after JWT verification.
 */
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      userId?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/** Make a signed JWT for a user id */
function sign(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}

/** Verify a JWT and return the subject (user id) if valid */
function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: string };
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Middleware for protected routes. Adds req.userId when valid.
 * Returns human-readable messages on 401s.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    return res.status(401).json({
      error: "missing_token",
      message: "You are not signed in. Please log in to continue.",
    });
  }

  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({
      error: "invalid_token",
      message: "Your session is no longer valid. Please log in again.",
    });
  }

  req.userId = userId;
  next();
}

/**
 * Build the auth router, wired to the provided PG pool.
 * Exposes:
 *   POST /auth/register  { email?, username?, password }
 *   POST /auth/login     { email?, username?, password }
 *
 * We accept `username` as an alias for `email` so existing UIs keep working.
 */
export function createAuthRouter(pool: Pool) {
  const router = Router();

  router.post("/register", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { email?: string; username?: string; password?: string };
      const rawEmail = (body.email ?? body.username ?? "").toString().trim();
      const password = (body.password ?? "").toString();

      if (!rawEmail || !password) {
        return res.status(400).json({
          error: "invalid_body",
          message: "Please provide both an email (or username) and a password.",
        });
      }

      const email = rawEmail.toLowerCase();

      if (password.length < 6) {
        return res.status(400).json({
          error: "weak_password",
          message: "Your password is too short. It must be at least 6 characters.",
          detail: "min_length_6",
        });
      }

      const hash = await bcrypt.hash(password, 10);

      // Insert; if email exists, rowCount will be 0 due to ON CONFLICT DO NOTHING
      const q = await pool.query<{ id: string }>(
        `
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        ON CONFLICT (email) DO NOTHING
        RETURNING id
        `,
        [email, hash]
      );

      if (q.rowCount === 0) {
        return res.status(400).json({
          error: "email_taken",
          message: "That email is already registered. Try logging in instead.",
        });
      }

      const userId = q.rows[0].id;
      const token = sign(userId);
      return res.json({ token, user: { id: userId, email } });
    } catch (err) {
      console.error("register_failed:", err);
      return res.status(500).json({
        error: "register_failed",
        message: "We couldn’t create your account. Please try again.",
      });
    }
  });

  router.post("/login", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { email?: string; username?: string; password?: string };
      const rawEmail = (body.email ?? body.username ?? "").toString().trim();
      const password = (body.password ?? "").toString();

      if (!rawEmail || !password) {
        return res.status(400).json({
          error: "invalid_body",
          message: "Please provide both your email (or username) and password.",
        });
      }

      const email = rawEmail.toLowerCase();

      const q = await pool.query<{ id: string; password_hash: string }>(
        `SELECT id, password_hash FROM users WHERE email = $1`,
        [email]
      );

      if (q.rowCount === 0) {
        return res.status(401).json({
          error: "invalid_credentials",
          message: "Invalid username/password combination",
        });
      }

      const user = q.rows[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({
          error: "invalid_credentials",
          message: "Invalid username/password combination",
        });
      }

      const token = sign(user.id);
      return res.json({ token, user: { id: user.id, email } });
    } catch (err) {
      console.error("login_failed:", err);
      return res.status(500).json({
        error: "login_failed",
        message: "We couldn’t sign you in. Please try again.",
      });
    }
  });

  return router;
}
