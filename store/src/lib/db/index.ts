/**
 * Database connection.
 *
 * - With DATABASE_URL set (Supabase, Neon or any Postgres), connects with postgres-js.
 * - Without it, runs PostgreSQL in-process with PGlite,
 *   so the whole store works locally with no setup (see data-dir.ts for the folder).
 *
 * Either way the schema is migrated and the catalogue seeded on first use.
 */
import path from 'node:path';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
export type { DB as Database };
import { dataDir } from '../data-dir';

export type DB = PostgresJsDatabase<typeof schema>;

const MIGRATIONS = path.join(process.cwd(), 'drizzle');
const LOCK_ID = 7_310_442; // any constant; serialises migrations across instances

type Holder = { promise?: Promise<DB> };
const holder: Holder = ((globalThis as Record<string, unknown>).__storeDb ??= {}) as Holder;

export function db(): Promise<DB> {
  holder.promise ??= connect().catch((e) => {
    holder.promise = undefined;
    throw e;
  });
  return holder.promise;
}

async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import('postgres');
    const { drizzle } = await import('drizzle-orm/postgres-js');
    // prepare:false keeps it compatible with transaction poolers (Supabase port 6543).
    const client = postgres(url, { prepare: false, max: Number(process.env.DATABASE_POOL ?? 5) });
    const instance = drizzle({ client, schema, casing: 'snake_case' });
    if (process.env.AUTO_MIGRATE !== '0') await setupPostgres(url, instance);
    return instance;
  }

  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const dir = path.join(dataDir(), 'pglite');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const instance = drizzle({ client, schema, casing: 'snake_case' });
  await migrate(instance, { migrationsFolder: MIGRATIONS });
  const typed = instance as unknown as DB;
  await seedIfEmpty(typed);
  return typed;
}

async function setupPostgres(url: string, instance: DB) {
  const { default: postgres } = await import('postgres');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { migrate } = await import('drizzle-orm/postgres-js/migrator');
  const one = postgres(url, { prepare: false, max: 1 });
  try {
    await one`select pg_advisory_lock(${LOCK_ID})`;
    await migrate(drizzle({ client: one, casing: 'snake_case' }), { migrationsFolder: MIGRATIONS });
    await seedIfEmpty(instance);
    await one`select pg_advisory_unlock(${LOCK_ID})`;
  } finally {
    await one.end({ timeout: 5 });
  }
}

async function seedIfEmpty(instance: DB) {
  const { seedCatalogue, ensureSetup } = await import('./seed');
  const existing = await instance.select({ id: schema.products.id }).from(schema.products).limit(1);
  if (existing.length === 0) await seedCatalogue(instance);
  await ensureSetup(instance);
}

export { schema };
