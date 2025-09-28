import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "./db";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 11);

export interface JwtClaims {
  sub: string; // user id
  email: string;
  iat: number;
  exp: number;
}

export function signToken(userId: string, email: string) {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn: "7d" });
}

export function authMiddleware(
  req: Request & { user?: JwtClaims },
  res: Response,
  next: NextFunction
) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const claims = jwt.verify(token, JWT_SECRET) as JwtClaims;
    req.user = claims;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export const authRouter = Router();

/** POST /auth/register  { email, password } -> { token, user } */
authRouter.post("/register", async (req: Request, res: Response) => {
  const { email, password } = (req.body || {}) as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  try {
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const insertResult = await pool.query<{
      id: string; email: string;
    }>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email`,
      [email.toLowerCase(), hashed]
    );
    const row = insertResult.rows[0];
    if (!row) return res.status(409).json({ error: "Email already registered" });

    const token = signToken(row.id, row.email);
    return res.status(201).json({ token, user: row });
  } catch (e: any) {
    return res.status(500).json({ error: "register_failed", detail: e.message });
  }
});

/** POST /auth/login  { email, password } -> { token, user } */
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = (req.body || {}) as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  try {
    const q = await pool.query<{ id: string; email: string; password_hash: string }>(
      `SELECT id, email, password_hash FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    const row = q.rows[0];
    if (!row) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const token = signToken(row.id, row.email);
    return res.json({ token, user: { id: row.id, email: row.email } });
  } catch (e: any) {
    return res.status(500).json({ error: "login_failed", detail: e.message });
  }
});
