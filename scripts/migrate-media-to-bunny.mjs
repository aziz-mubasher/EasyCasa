/**
 * One-off: copy MinIO `listings/*` → Bunny Storage (HTTP API) and rewrite media.url to CDN.
 * Run inside the API container:
 *   docker compose ... exec -T api node /tmp/migrate-media-to-bunny.mjs
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(pathToFileURL('/repo/apps/api/package.json').href);
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Client } = require('pg');

function env(name, fallback = '') {
  const v = process.env[name];
  return v == null || v === '' ? fallback : v;
}

async function streamToBuffer(body) {
  if (!body) throw new Error('empty body');
  if (Buffer.isBuffer(body)) return body;
  if (typeof body.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray());
  }
  const chunks = [];
  for await (const c of body) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

function bunnyObjectUrl(httpBase, zone, key) {
  const base = httpBase.replace(/\/$/, '');
  const path = key
    .split('/')
    .filter(Boolean)
    .map((p) => encodeURIComponent(p))
    .join('/');
  return `${base}/${encodeURIComponent(zone)}/${path}`;
}

async function main() {
  const cdn = env('BUNNY_CDN_BASE', env('MEDIA_PUBLIC_BASE')).replace(/\/$/, '');
  const zone = env('BUNNY_STORAGE_ZONE');
  const bunnyPass = env('BUNNY_STORAGE_PASSWORD');
  const region = env('BUNNY_S3_REGION', 'de');
  if (!zone || !bunnyPass || !cdn) {
    throw new Error('missing BUNNY_STORAGE_ZONE / BUNNY_STORAGE_PASSWORD / CDN base');
  }

  // Global HTTP host always resolves; regional `de.storage…` may not exist.
  // Dashboard "Hostname" is usually storage.bunnycdn.com (zone path in URL).
  const httpBase = env('BUNNY_STORAGE_HTTP_BASE', 'https://storage.bunnycdn.com').replace(
    /\/$/,
    '',
  );
  console.log(`bunny http base: ${httpBase} (region hint ${region})`);

  const minio = new S3Client({
    endpoint: env('S3_ENDPOINT', 'http://minio:9000'),
    region: env('S3_REGION', 'us-east-1'),
    forcePathStyle: true,
    credentials: {
      accessKeyId: env('MINIO_ROOT_USER'),
      secretAccessKey: env('MINIO_ROOT_PASSWORD'),
    },
  });
  const minioBucket = env('MINIO_BUCKET', 'easycasa-media');

  const keys = [];
  let token;
  do {
    const page = await minio.send(
      new ListObjectsV2Command({
        Bucket: minioBucket,
        Prefix: 'listings/',
        ContinuationToken: token,
      }),
    );
    for (const obj of page.Contents || []) {
      if (obj.Key && !obj.Key.endsWith('/')) keys.push(obj.Key);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  console.log(`minio listing objects: ${keys.length}`);
  let uploaded = 0;
  let skipped = 0;
  for (const key of keys) {
    const url = bunnyObjectUrl(httpBase, zone, key);
    const head = await fetch(url, { method: 'GET', headers: { AccessKey: bunnyPass } });
    if (head.ok) {
      await head.arrayBuffer().catch(() => undefined);
      skipped += 1;
      console.log(`exists ${key}`);
      continue;
    }
    if (head.status !== 404) {
      const t = await head.text().catch(() => '');
      throw new Error(`Bunny probe ${key}: ${head.status} ${t.slice(0, 200)}`);
    }

    const got = await minio.send(new GetObjectCommand({ Bucket: minioBucket, Key: key }));
    const body = await streamToBuffer(got.Body);
    const ct = got.ContentType || (key.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
    const put = await fetch(url, {
      method: 'PUT',
      headers: {
        AccessKey: bunnyPass,
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body,
    });
    if (!put.ok) {
      const t = await put.text().catch(() => '');
      throw new Error(`Bunny PUT ${key}: ${put.status} ${t.slice(0, 200)}`);
    }
    uploaded += 1;
    console.log(`uploaded ${key} (${body.length} bytes)`);
  }

  const db = new Client({ connectionString: env('DATABASE_URL') });
  await db.connect();
  const upd = await db.query(
    `UPDATE media
     SET url = $1 || '/' || substring(url from '/api/media/file/(.+)$')
     WHERE url LIKE '%/api/media/file/listings/%'
     RETURNING id, url`,
    [cdn],
  );
  console.log(`db urls rewritten: ${upd.rowCount}`);
  for (const r of upd.rows) console.log(`  ${r.id} -> ${r.url}`);
  await db.end();

  console.log(
    JSON.stringify(
      { keys: keys.length, uploaded, skipped, rewritten: upd.rowCount, cdn },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
