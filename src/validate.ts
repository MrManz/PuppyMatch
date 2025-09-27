import { z } from "zod";


export const interestsBody = z.object({
interests: z
.array(z.string().trim().min(1).transform((s) => s.toLowerCase()))
.max(200)
.default([]),
});


export type InterestsBody = z.infer<typeof interestsBody>;


export function normalizeUserId(raw: string) {
// simple guard — adjust to your ID scheme
return raw.trim();
}


// File: src/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createPool, ensureSchema, getUserInterests, putUserInterests } from "./db.js";
import { interestsBody, normalizeUserId } from "./validate.js";


dotenv.config();


const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());


const pool = createPool();
ensureSchema(pool).catch((e) => {
// eslint-disable-next-line no-console
console.error("Failed to ensure schema", e);
process.exit(1);
});


app.get("/health", (_req, res) => res.json({ ok: true }));


app.get("/users/:userId/interests", async (req, res) => {
try {
const userId = normalizeUserId(req.params.userId);
const interests = await getUserInterests(pool, userId);
res.json({ userId, interests });
} catch (e: any) {
res.status(500).json({ error: e.message ?? "Internal error" });
}
});


app.put("/users/:userId/interests", async (req, res) => {
try {
const userId = normalizeUserId(req.params.userId);
const parsed = interestsBody.safeParse(req.body);
if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
await putUserInterests(pool, userId, parsed.data.interests);
res.json({ userId, saved: parsed.data.interests.length });
} catch (e: any) {
res.status(500).json({ error: e.message ?? "Internal error" });
}
});


});
