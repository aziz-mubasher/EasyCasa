import { writeFile } from 'node:fs/promises';
import { pgPool, wpConnection, closeAll } from './db.js';
import { config, wpTable } from './config.js';
import { log } from './logger.js';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * Compare source (WordPress) vs target (Postgres) record counts and write
 * a report. Exits non-zero if a critical mismatch is detected, so CI can gate.
 */
interface Check {
  name: string;
  wp: number;
  pg: number;
  critical: boolean;
}

async function scalarPg(sql: string): Promise<number> {
  const { rows } = await pgPool.query<{ n: string }>(sql);
  return Number(rows[0]?.n ?? 0);
}

async function run(): Promise<void> {
  const wp = await wpConnection();

  const [listingRows] = await wp.query<(RowDataPacket & { n: number })[]>(
    `SELECT COUNT(*) AS n FROM ${wpTable('posts')} WHERE post_type = ? AND post_status = 'publish'`,
    [config.WP_LISTING_POST_TYPE],
  );
  const [userRows] = await wp.query<(RowDataPacket & { n: number })[]>(
    `SELECT COUNT(*) AS n FROM ${wpTable('users')}`,
  );
  const [pageRows] = await wp.query<(RowDataPacket & { n: number })[]>(
    `SELECT COUNT(*) AS n FROM ${wpTable('posts')} WHERE post_type IN ('page','post') AND post_status='publish'`,
  );
  const wpListings = { n: Number(listingRows[0]?.n ?? 0) };
  const wpUsers = { n: Number(userRows[0]?.n ?? 0) };
  const wpPages = { n: Number(pageRows[0]?.n ?? 0) };

  const checks: Check[] = [
    {
      name: 'Published listings',
      wp: Number(wpListings.n),
      pg: await scalarPg(`SELECT COUNT(*) n FROM listings WHERE status='published'`),
      critical: true,
    },
    {
      name: 'Users',
      wp: Number(wpUsers.n),
      pg: await scalarPg(`SELECT COUNT(*) n FROM users`),
      critical: false,
    },
    {
      name: 'Editorial content',
      wp: Number(wpPages.n),
      pg: await scalarPg(`SELECT COUNT(*) n FROM content`),
      critical: false,
    },
    {
      name: 'Listings geocoded',
      wp: Number(wpListings.n),
      pg: await scalarPg(`SELECT COUNT(*) n FROM listings WHERE location IS NOT NULL`),
      critical: false,
    },
    {
      name: 'Media rows',
      wp: 0,
      pg: await scalarPg(`SELECT COUNT(*) n FROM media`),
      critical: false,
    },
  ];

  // Per-category / per-region breakdown (target side)
  const byCategory = await pgPool.query(
    `SELECT c.key, COUNT(*) n FROM listings l JOIN categories c ON c.id=l.category_id GROUP BY c.key ORDER BY n DESC`,
  );
  const byRegion = await pgPool.query(
    `SELECT r.name, COUNT(*) n FROM listings l JOIN regions r ON r.id=l.region_id GROUP BY r.name ORDER BY n DESC`,
  );

  let failed = false;
  const lines: string[] = ['# Reconciliation Report', '', `Generated: ${new Date().toISOString()}`, '', '| Check | WordPress | Postgres | Δ | Status |', '|---|---:|---:|---:|:--|'];
  for (const c of checks) {
    const delta = c.pg - c.wp;
    const bad = c.critical && c.wp !== c.pg;
    if (bad) failed = true;
    lines.push(`| ${c.name} | ${c.wp} | ${c.pg} | ${delta} | ${bad ? '❌ FAIL' : '✅'} |`);
  }
  lines.push('', '## Listings by category', '', '| Category | Count |', '|---|---:|');
  for (const r of byCategory.rows) lines.push(`| ${r.key} | ${r.n} |`);
  lines.push('', '## Listings by region', '', '| Region | Count |', '|---|---:|');
  for (const r of byRegion.rows) lines.push(`| ${r.name} | ${r.n} |`);

  const report = lines.join('\n');
  await writeFile(new URL('../out/reconcile-report.md', import.meta.url), report, 'utf8');
  log.info('\n' + report);

  await wp.end();
  await closeAll();
  if (failed) {
    log.error('reconciliation FAILED — critical counts do not match');
    process.exit(2);
  }
  log.info('reconciliation passed');
}

run().catch((e) => {
  log.error('reconcile crashed', e);
  process.exit(1);
});
