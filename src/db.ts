// src/db.ts
import { Pool } from "pg";

const {
  DATABASE_URL,
  PGHOST,
  PGPORT,
  PGUSER,
  PGPASSWORD,
  PGDATABASE,
  PGSSLMODE,
  PG_CA, // optional PEM (single-line env with \n escaped)
} = process.env;

function buildConnectionString() {
  if (DATABASE_URL) return DATABASE_URL;
  if (PGHOST && PGUSER && PGPASSWORD) {
    const host = PGHOST;
    const port = PGPORT || "5432";
    const db = PGDATABASE || "postgres";
    const q = PGSSLMODE ? `?sslmode=${PGSSLMODE}` : "";
    return `postgres://${encodeURIComponent(PGUSER)}:${encodeURIComponent(PGPASSWORD)}@${host}:${port}/${db}${q}`;
  }
  return undefined;
}

const ssl =
  PG_CA
    ? { ca: PG_CA.replace(/\\n/g, "\n") }
    : { rejectUnauthorized: false };

export let pool: Pool;

export function createPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: buildConnectionString(),
      ssl,
    });
  }
  return pool;
}

export async function ensureSchema(p: Pool = createPool()) {
  // gen_random_uuid() needs pgcrypto; if not available, swap to uuid-ossp
  await p.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS user_interests (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      interest TEXT NOT NULL,
      PRIMARY KEY (user_id, interest)
    );
  `);
}

export async function getUserInterests(userId: string, p: Pool = createPool()): Promise<string[]> {
  const q = await p.query<{ interest: string }>(
    `SELECT interest FROM user_interests WHERE user_id = $1 ORDER BY interest`,
    [userId]
  );
  return q.rows.map(r => r.interest);
}

export async function putUserInterests(userId: string, interests: string[], p: Pool = createPool()): Promise<number> {
  await p.query("BEGIN");
  try {
    await p.query(`DELETE FROM user_interests WHERE user_id = $1`, [userId]);
    for (const interest of interests) {
      await p.query(`INSERT INTO user_interests (user_id, interest) VALUES ($1, $2)`, [userId, interest]);
    }
    await p.query("COMMIT");
    return interests.length;
  } catch (e) {
    await p.query("ROLLBACK");
    throw e;
  }
}
