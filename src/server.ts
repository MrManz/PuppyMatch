import express from "express";
import cors from "cors";
import { authRouter, authMiddleware } from "./auth";
import { pool } from "./db";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);

// Authenticated interests endpoints using JWT subject
app.get("/users/me/interests", authMiddleware, async (req, res) => {
  const userId = (req as any).user.sub as string;
  const q = await pool.query<{ interest: string }>(
    `SELECT interest FROM user_interests WHERE user_id = $1 ORDER BY interest`,
    [userId]
  );
  res.json({ userId, interests: q.rows.map((r) => r.interest) });
});

app.put("/users/me/interests", authMiddleware, async (req, res) => {
  const userId = (req as any).user.sub as string;
  const interests: string[] = Array.isArray(req.body?.interests) ? req.body.interests : [];
  await pool.query("BEGIN");
  try {
    await pool.query(`DELETE FROM user_interests WHERE user_id = $1`, [userId]);
    for (const interest of interests) {
      await pool.query(`INSERT INTO user_interests (user_id, interest) VALUES ($1, $2)`, [
        userId,
        interest,
      ]);
    }
    await pool.query("COMMIT");
    res.json({ userId, saved: interests.length });
  } catch (e) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error: "save_failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});
