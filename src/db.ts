import { Pool } from "pg";


// Minimal, TS-safe, and Render-friendly.
export function createPool() {
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL env var is required");


// Keep SSL handling simple to avoid syntax hiccups.
let ssl: any = undefined;
if (process.env.DATABASE_CA) {
// Proper verification using Aiven CA (recommended)
ssl = { ca: process.env.DATABASE_CA };
} else if (
(process.env.PGSSLMODE || "").toLowerCase() === "no-verify" ||
/sslmode=require/i.test(connectionString) ||
/aivencloud\.com/i.test(connectionString)
) {
// Quick path for hosted/self-signed chains
ssl = { rejectUnauthorized: false };
}


return new Pool({ connectionString, ssl });
}


export type InterestRow = { user_id: string; interest: string };


export async function ensureSchema(pool: Pool) {
await pool.query(`
CREATE TABLE IF NOT EXISTS user_interests (
user_id TEXT NOT NULL,
interest TEXT NOT NULL,
PRIMARY KEY (user_id, interest)
);
`);
}


export async function getUserInterests(pool: Pool, userId: string): Promise<string[]> {
const { rows } = await pool.query<InterestRow>(
`SELECT interest FROM user_interests WHERE user_id = $1 ORDER BY interest ASC`,
[userId]
);
return rows.map((r) => r.interest);
}


export async function putUserInterests(pool: Pool, userId: string, interests: string[]) {
const client = await pool.connect();
try {
await client.query("BEGIN");
await client.query(`DELETE FROM user_interests WHERE user_id = $1`, [userId]);
for (const it of interests) {
await client.query(
`INSERT INTO user_interests(user_id, interest) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
[userId, it]
);
}
await client.query("COMMIT");
} catch (e) {
await client.query("ROLLBACK");
throw e;
} finally {
client.release();
}
}
