import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pgPool } from './db.js';
import { log } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_DIR = join(__dirname, '..', 'sql');

async function ensureMigrationsTable(): Promise<void> {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function applied(): Promise<Set<string>> {
  const { rows } = await pgPool.query<{ name: string }>('SELECT name FROM _migrations');
  return new Set(rows.map((r) => r.name));
}

async function run(): Promise<void> {
  await ensureMigrationsTable();
  const done = await applied();
  const files = (await readdir(SQL_DIR))
    .filter((f) => f.endsWith('.sql') && !f.startsWith('._'))
    .sort();

  for (const file of files) {
    if (done.has(file)) {
      log.info(`skip (already applied): ${file}`);
      continue;
    }
    const sql = await readFile(join(SQL_DIR, file), 'utf8');
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations(name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      log.info(`applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      log.error(`failed: ${file}`, err);
      throw err;
    } finally {
      client.release();
    }
  }
  log.info('migrations complete');
  await pgPool.end();
}

run().catch((e) => {
  log.error('migration runner crashed', e);
  process.exit(1);
});
