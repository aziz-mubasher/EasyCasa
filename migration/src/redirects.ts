import { writeFile } from 'node:fs/promises';
import { pgPool } from './db.js';
import { config } from './config.js';
import { log } from './logger.js';

/**
 * Build the old->new URL map for SEO-safe cutover.
 * Old WP permalinks are derived from slugs + WP_PERMALINK_BASE; verify the
 * real permalink structure (Settings > Permalinks) and adjust oldPath().
 */
function oldListingPath(slug: string): string {
  const base = config.WP_PERMALINK_BASE.replace(/\/$/, '');
  return `${base}/${slug}/`;
}
function newListingPath(slug: string): string {
  return `/listings/${slug}`;
}

async function run(): Promise<void> {
  const listings = await pgPool.query<{ slug: string }>(
    `SELECT slug FROM listings WHERE slug IS NOT NULL`,
  );
  const content = await pgPool.query<{ slug: string; type: string }>(
    `SELECT slug, type FROM content WHERE slug IS NOT NULL`,
  );

  const map: Array<{ old: string; neu: string }> = [];
  for (const l of listings.rows) map.push({ old: oldListingPath(l.slug), neu: newListingPath(l.slug) });
  for (const c of content.rows) {
    const oldPath = c.type === 'post' ? `/blog/${c.slug}/` : `/${c.slug}/`;
    const newPath = c.type === 'post' ? `/guide/${c.slug}` : `/${c.slug}`;
    map.push({ old: oldPath, neu: newPath });
  }

  // Persist to DB (idempotent) and export CSV + a Caddy snippet.
  for (const m of map) {
    await pgPool.query(
      `INSERT INTO redirects (old_path, new_path, status_code)
       VALUES ($1,$2,301) ON CONFLICT (old_path) DO UPDATE SET new_path = EXCLUDED.new_path`,
      [m.old, m.neu],
    );
  }

  const csv = ['old_path,new_path,status', ...map.map((m) => `${m.old},${m.neu},301`)].join('\n');
  await writeFile(new URL('../out/redirects.csv', import.meta.url), csv, 'utf8');

  const caddy = map.map((m) => `\tredir ${m.old} ${m.neu} permanent`).join('\n');
  await writeFile(new URL('../out/redirects.caddy', import.meta.url), caddy, 'utf8');

  log.info(`redirects written: ${map.length} (out/redirects.csv, out/redirects.caddy)`);
  await pgPool.end();
}

run().catch((e) => {
  log.error('redirects crashed', e);
  process.exit(1);
});
