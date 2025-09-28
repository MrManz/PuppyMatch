// src/index.ts
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { authRouter, authMiddleware } from "./auth";
import {
  createPool,
  ensureSchema,
  getUserInterests,
  putUserInterests,
} from "./db";

const app = express();
app.use(cors());
app.use(express.json());

// --- init db + schema ---
const pool = createPool();
ensureSchema(pool).catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("Failed to ensure schema:", msg);
  process.exit(1);
});

// --- health/info ---
app.get("/", (_req, res) => {
  res.json({ ok: true, name: "PuppyMatch API" });
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e: unknown) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

// --- auth routes ---
app.use("/auth", authRouter);

// --- protected interests (JWT required) ---
// frontend should redirect to /login on 401
app.get(
  "/users/me/interests",
  authMiddleware,
  async (req: Request & { user?: { sub: string } }, res: Response) => {
    // authMiddleware guarantees req.user or 401
    const userId = req.user!.sub;
    try {
      const interests = await getUserInterests(userId, pool);
      // if user has no interests yet, return empty array (still 200)
      res.json({ userId, interests });
    } catch (e: unknown) {
      res
        .status(500)
        .json({ error: "load_failed", detail: e instanceof Error ? e.message : String(e) });
    }
  }
);

app.put(
  "/users/me/interests",
  authMiddleware,
  async (req: Request & { user?: { sub: string } }, res: Response) => {
    const userId = req.user!.sub;
    const interests: unknown = req.body?.interests;

    if (!Array.isArray(interests) || !interests.every((x) => typeof x === "string")) {
      return res.status(400).json({ error: "invalid_interests" });
    }

    try {
      const saved = await putUserInterests(userId, interests, pool);
      res.json({ userId, saved });
    } catch (e: unknown) {
      res
        .status(500)
        .json({ error: "save_failed", detail: e instanceof Error ? e.message : String(e) });
    }
  }
);

// --- optional legacy routes (ignore :userId, still use JWT subject) ---
app.get(
  "/users/:userId/interests",
  authMiddleware,
  async (req: Request & { user?: { sub: string } }, res: Response) => {
    const userId = req.user!.sub;
    try {
      const interests = await getUserInterests(userId, pool);
      res.json({ userId, interests });
    } catch (e: unknown) {
      res
        .status(500)
        .json({ error: "load_failed", detail: e instanceof Error ? e.message : String(e) });
    }
  }
);

app.put(
  "/users/:userId/interests",
  authMiddleware,
  async (req: Request & { user?: { sub: string } }, res: Response) => {
    const userId = req.user!.sub;
    const interests: unknown = req.body?.interests;

    if (!Array.isArray(interests) || !interests.every((x) => typeof x === "string")) {
      return res.status(400).json({ error: "invalid_interests" });
    }

    try {
      const saved = await putUserInterests(userId, interests, pool);
      res.json({ userId, saved });
    } catch (e: unknown) {
      res
        .status(500)
        .json({ error: "save_failed", detail: e instanceof Error ? e.message : String(e) });
    }
  }
);

// --- start server ---
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});
