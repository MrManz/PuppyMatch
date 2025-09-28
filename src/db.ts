import { Pool } from "pg";

const {
  DATABASE_URL,
  PGHOST,
  PGPORT,
  PGUSER,
  PGPASSWORD,
  PGDATABASE,
  PGSSLMODE,
  PG_CA, // optional, put your PEM here or set via env
} = process.env;

const connectionString =
  DATABASE_URL ||
  (PGHOST &&
    `postgres://${encodeURIComponent(PGUSER || "")}:${encodeURIComponent(
      PGPASSWORD || ""
    )}@${PGHOST}:${PGPORT || 5432}/${PGDATABASE || "postgres"}${
      PGSSLMODE ? `?sslmode=${PGSSLMODE}` : ""
    }`) ||
  undefined;

// Allow either explicit CA or relaxed SSL to dodge self-signed issues
const ssl =
  PG_CA
    ? { ca: PG_CA.replace(/\\n/g, "\n") }
    : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString,
  ssl,
});
