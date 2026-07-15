import { pgPool, wpConnection, closeAll } from '../db.js';
import { log } from '../logger.js';
import { fetchListings, fetchPostMeta, fetchUsers, fetchContent } from './extract.js';
import { transformListing, transformUser } from './transform.js';
import { upsertListing, upsertUser } from './load.js';

async function run(): Promise<void> {
  const wp = await wpConnection();
  const client = await pgPool.connect();
  let users = 0;
  let listings = 0;
  let content = 0;

  try {
    // ---- Users -> internal id map ----
    const wpUserId2Id = new Map<number, string>();
    for (const u of await fetchUsers(wp)) {
      const id = await upsertUser(client, transformUser(u));
      wpUserId2Id.set(u.ID, id);
      users++;
    }
    log.info(`users upserted: ${users}`);

    // ---- Listings ----
    for (const post of await fetchListings(wp)) {
      const meta = await fetchPostMeta(wp, post.ID);
      const row = transformListing(post, meta);
      const agentId = wpUserId2Id.get(row.wp_author_id) ?? null;
      await upsertListing(client, row, agentId);
      listings++;
      if (listings % 100 === 0) log.info(`  ...${listings} listings`);
    }
    log.info(`listings upserted: ${listings}`);

    // ---- Editorial content ----
    for (const c of await fetchContent(wp)) {
      await client.query(
        `INSERT INTO content (wp_post_id, type, slug, locale, title, body_html, status, published_at)
         VALUES ($1,$2,$3,'it',$4,$5,'published',$6)
         ON CONFLICT (wp_post_id) DO UPDATE
           SET title = EXCLUDED.title, body_html = EXCLUDED.body_html`,
        [
          c.ID,
          c.post_type === 'page' ? 'page' : 'post',
          c.post_name || `content-${c.ID}`,
          c.post_title,
          c.post_content,
          c.post_date_gmt ? `${c.post_date_gmt}Z` : null,
        ],
      );
      content++;
    }
    log.info(`content upserted: ${content}`);
  } catch (err) {
    log.error('ETL failed', err);
    throw err;
  } finally {
    client.release();
    await wp.end();
    await closeAll();
  }

  log.info(`ETL complete — users=${users} listings=${listings} content=${content}`);
}

run().catch(() => process.exit(1));
