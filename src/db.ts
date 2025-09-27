import pg from "pg";
throw new Error("DATABASE_URL env var is required");
}


let ssl: false | { ca?: string; rejectUnauthorized?: boolean } | undefined = undefined;


if (process.env.DATABASE_CA) {
// Best practice: verify server cert using Aiven's CA contents
ssl = { ca: process.env.DATABASE_CA };
} else if ((process.env.PGSSLMODE || "").toLowerCase() === "no-verify") {
// Quick fix: don't verify certificate chain
ssl = { rejectUnauthorized: false };
} else if (connectionString.includes("sslmode=require")) {
// Many hosted PGs (Aiven) use self-signed certs; allow without CA
ssl = { rejectUnauthorized: false };
}


return new Pool({ connectionString, ssl });
}


export type InterestRow = { user_id: string; interest: string };


export async function ensureSchema(pool: pg.Pool) {
await pool.query(`
CREATE TABLE IF NOT EXISTS user_interests (
user_id TEXT NOT NULL,
interest TEXT NOT NULL,
PRIMARY KEY (user_id, interest)
);
`);
}


export async function getUserInterests(pool: pg.Pool, userId: string): Promise<string[]> {
const { rows } = await pool.query<InterestRow>(
`SELECT interest FROM user_interests WHERE user_id = $1 ORDER BY interest ASC`,
[userId]
);
return rows.map((r) => r.interest);
}


export async function putUserInterests(pool: pg.Pool, userId: string, interests: string[]) {
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
