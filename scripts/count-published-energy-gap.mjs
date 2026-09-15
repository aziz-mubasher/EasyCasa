#!/usr/bin/env node
/**
 * Read-only count of published listings missing energy figures.
 * Never writes. Prints the SQL and, if DATABASE_URL is set, the result.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sql = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'count-published-energy-gap.sql'),
  'utf8',
);

console.log('--- SQL (read-only) ---');
console.log(sql);

if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL unset — query not executed. Record last-known figures from docs.');
  process.exit(0);
}

const { default: pg } = await import('pg');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const energy = await client.query(sql.split('-- Ownership-checked')[0]);
  const vo = await client.query('SELECT count(*)::int AS verified_owner_case_total FROM verified_owner_case');
  console.log('--- energy gap ---');
  console.log(energy.rows[0]);
  console.log('--- verified_owner_case ---');
  console.log(vo.rows[0]);
} finally {
  await client.end();
}
