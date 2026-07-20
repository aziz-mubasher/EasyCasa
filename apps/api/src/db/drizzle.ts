import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { apiConfig } from '../config';
import { schema } from './schema';

/**
 * Lazy pool — Phase 34 integration harness sets `DATABASE_URL` before Nest
 * `app.init()`, so we must not bind the connection string at import time.
 */
let poolInstance: pg.Pool | undefined;
let dbInstance: NodePgDatabase<typeof schema> | undefined;

export function getPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new pg.Pool({ connectionString: apiConfig.DATABASE_URL });
  }
  return poolInstance;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

/** Drop cached connections after testcontainers rotates DATABASE_URL. */
export async function resetDbConnection(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end().catch(() => undefined);
  }
  poolInstance = undefined;
  dbInstance = undefined;
}

/** Back-compat: call sites keep `import { db, pool }` — resolves lazily. */
export const pool: pg.Pool = new Proxy({} as pg.Pool, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getPool(), prop, receiver);
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(getPool()) : value;
  },
});

export const db: NodePgDatabase<typeof schema> = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export type Db = NodePgDatabase<typeof schema>;
