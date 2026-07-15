import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import pLimit from 'p-limit';
import { pgPool } from './db.js';
import { config } from './config.js';
import { log } from './logger.js';

/**
 * Migrate listing images from the WordPress uploads URLs into MinIO/S3,
 * re-encoding to WebP and generating a tiny blur placeholder.
 * Idempotent: media rows are keyed by original_wp_url.
 *
 * NOTE: This reads media references from listings.attributes->'gallery' (JSON)
 * OR from a wp_media staging table you populate during ETL. Adjust the source
 * query to match how galleries were stored by the WP plugin (see wp-audit.md).
 */
const s3 = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.MINIO_ROOT_USER,
    secretAccessKey: config.MINIO_ROOT_PASSWORD,
  },
});

async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: config.MINIO_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: config.MINIO_BUCKET }));
    log.info(`created bucket ${config.MINIO_BUCKET}`);
  }
}

interface PendingMedia {
  listing_id: string;
  original_wp_url: string;
  position: number;
}

/** Override this query to match where galleries live after ETL. */
async function pendingMedia(): Promise<PendingMedia[]> {
  const { rows } = await pgPool.query<PendingMedia>(
    `SELECT l.id AS listing_id,
            g.url AS original_wp_url,
            g.ord AS position
       FROM listings l
       CROSS JOIN LATERAL jsonb_to_recordset(
            COALESCE(l.attributes->'gallery','[]'::jsonb)
       ) AS g(url text, ord int)
      WHERE g.url IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM media m WHERE m.original_wp_url = g.url)`,
  );
  return rows;
}

async function processOne(item: PendingMedia): Promise<void> {
  const res = await fetch(item.original_wp_url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    log.warn(`skip media HTTP ${res.status}: ${item.original_wp_url}`);
    return;
  }
  const input = Buffer.from(await res.arrayBuffer());
  const img = sharp(input).rotate();
  const meta = await img.metadata();
  const webp = await img.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const placeholder = await img.clone().resize(16).webp({ quality: 30 }).toBuffer();

  const key = `listings/${item.listing_id}/${item.position}.webp`;
  await s3.send(
    new PutObjectCommand({
      Bucket: config.MINIO_BUCKET,
      Key: key,
      Body: webp,
      ContentType: 'image/webp',
      ACL: 'public-read',
    }),
  );

  const url = `${config.MEDIA_PUBLIC_BASE}/${key}`;
  await pgPool.query(
    `INSERT INTO media (listing_id, type, url, original_wp_url, position, width, height, placeholder)
     VALUES ($1,'image',$2,$3,$4,$5,$6,$7)
     ON CONFLICT (original_wp_url) DO NOTHING`,
    [
      item.listing_id, url, item.original_wp_url, item.position,
      meta.width ?? null, meta.height ?? null,
      `data:image/webp;base64,${placeholder.toString('base64')}`,
    ],
  );
}

async function run(): Promise<void> {
  await ensureBucket();
  const items = await pendingMedia();
  log.info(`media to migrate: ${items.length}`);
  const limit = pLimit(5);
  let done = 0;
  await Promise.all(
    items.map((it) =>
      limit(async () => {
        try {
          await processOne(it);
          done++;
          if (done % 50 === 0) log.info(`  ...${done} images`);
        } catch (e) {
          log.warn(`media failed: ${it.original_wp_url}`, e);
        }
      }),
    ),
  );
  log.info(`media migrated: ${done}/${items.length}`);
  await pgPool.end();
}

run().catch((e) => {
  log.error('media crashed', e);
  process.exit(1);
});
