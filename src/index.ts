// src/index.ts
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { authRouter, authMiddleware } from "./auth";
import { createPool, ensureSchema, getUserInterests, putUserInterests } from "./db";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Initialize the pool here (don’t import `pool` directly)
const pool = createPool();

// Ensure schema on boot
ensureSchema(pool).catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("Failed to ensure schema:", msg);
  process.exit(1);
});

app.use("/auth", authRouter);

// Authenticated routes using JWT subject
app.get("/users/me/interests", authMiddleware, async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user.sub as string;
  const interests = await getUserInterests(userId, pool);
  res.json({ userId, interests });
});

app.put("/users/me/interests", authMiddleware, async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user.sub as string;
  const interests: string[] = Array.isArray(req.body?.interests) ? req.body.interests : [];
  const saved = await putUserInterests(userId, interests, pool);
  res.json({ userId, saved });
});

// Optional legacy compatibility (ignores :userId and uses token)
app.get("/users/:userId/interests", authMiddleware, async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user.sub as string;
  const interests = await getUserInterests(userId, pool);
  res.json({ userId, interests });
});

app.put("/users/:userId/interests", authMiddleware, async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user.sub as string;
  const interests: string[] = Array.isArray(req.body?.interests) ? req.body.interests : [];
  const saved = await putUserInterests(userId, interests, pool);
  res.json({ userId, saved });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});
