/**
 * Database client.
 * - DATABASE_URL set  => Postgres (Neon / Supabase / any) via postgres-js.
 * - DATABASE_URL empty => embedded PGlite in ./.data/pglite (dev & tests only).
 * Both share the same Drizzle schema. Migrations run automatically on first access
 * for PGlite; for Postgres run `pnpm db:migrate` (or let `ensureMigrated()` do it on boot).
 */
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import path from "node:path";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

type Global = typeof globalThis & {
  __ccg_db?: Promise<Db>;
  __ccg_db_mode?: "pglite" | "postgres";
};
const g = globalThis as Global;

const migrationsFolder = path.join(process.cwd(), "drizzle");

async function createPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir =
    process.env.PGLITE_DATA_DIR === "memory"
      ? undefined
      : (process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "pglite"));
  if (dataDir) await (await import("node:fs/promises")).mkdir(dataDir, { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  await client.waitReady;
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  g.__ccg_db_mode = "pglite";
  return db as unknown as Db;
}

async function createPostgres(url: string): Promise<Db> {
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const client = postgres(url, { max: 5, prepare: false });
  const db = drizzle(client, { schema });
  if (process.env.DB_AUTO_MIGRATE !== "false") {
    await migrate(db, { migrationsFolder });
  }
  g.__ccg_db_mode = "postgres";
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  if (!g.__ccg_db) {
    const url = process.env.DATABASE_URL?.trim();
    g.__ccg_db = url ? createPostgres(url) : createPglite();
    g.__ccg_db.catch(() => {
      g.__ccg_db = undefined;
    });
  }
  return g.__ccg_db;
}

export function dbMode() {
  return g.__ccg_db_mode ?? (process.env.DATABASE_URL?.trim() ? "postgres" : "pglite");
}

/** Test helper: fresh in-memory database. */
export async function createTestDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite();
  await client.waitReady;
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return db as unknown as Db;
}

export { schema };
