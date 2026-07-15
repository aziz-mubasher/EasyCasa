import pg from 'pg';
import mysql from 'mysql2/promise';
import { config } from './config.js';

/** Target Postgres pool. */
export const pgPool = new pg.Pool({ connectionString: config.DATABASE_URL });

/** Source WordPress MySQL connection (lazy). */
export async function wpConnection(): Promise<mysql.Connection> {
  return mysql.createConnection({
    host: config.WP_DB_HOST,
    port: config.WP_DB_PORT,
    user: config.WP_DB_USER,
    password: config.WP_DB_PASSWORD,
    database: config.WP_DB_NAME,
    dateStrings: true,
  });
}

export async function closeAll(): Promise<void> {
  await pgPool.end();
}
