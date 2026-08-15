import { createHash } from 'node:crypto';

import type { ApiConfig } from '../config';
import type { Db } from '../db/drizzle';
import { media, moderationEvents } from '../db/schema';
import { eq } from 'drizzle-orm';

export type PerceptualHashes = {
  dhash: bigint;
  phash: bigint;
  dhashBucket: number;
};

/** Postgres `bigint` is signed int64 — AI hashes must fit or inserts 500. */
const PG_BIGINT_MAX = 9223372036854775807n;
const PG_BIGINT_MIN = -9223372036854775808n;

export function toPgInt64OrNull(value: bigint): bigint | null {
  if (value > PG_BIGINT_MAX || value < PG_BIGINT_MIN) return null;
  return value;
}

/** Call AI `/v1/image-hashes` — fail-soft (returns null) if AI down. */
export async function fetchPerceptualHashes(
  cfg: ApiConfig,
  imageBytes: Buffer,
): Promise<PerceptualHashes | null> {
  const base = cfg.AI_URL.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/v1/image-hashes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageBase64: imageBytes.toString('base64') }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      dhash: number | string;
      phash: number | string;
      dhashBucket: number;
    };
    const dhash = toPgInt64OrNull(BigInt(json.dhash));
    const phash = toPgInt64OrNull(BigInt(json.phash));
    // Out-of-range unsigned-style hashes must not block listing uploads (PK-4 CDN path).
    if (dhash == null || phash == null) return null;
    return {
      dhash,
      phash,
      dhashBucket: Number(json.dhashBucket),
    };
  } catch {
    return null;
  }
}

function hamming64(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x > 0n) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

/**
 * EC-S-T12 — look for perceptual duplicates in the same dhash bucket.
 * Same-account matches are ignored (content-addressing handles exact copies).
 */
export async function findDuplicateMedia(
  db: Db,
  hashes: PerceptualHashes,
  ownerUserId: string | null,
): Promise<{ kind: 'DUPLICATE' | 'NEAR_DUPLICATE'; mediaId: string; listingId: string | null } | null> {
  const candidates = await db
    .select({
      id: media.id,
      listingId: media.listingId,
      ownerUserId: media.ownerUserId,
      dhash: media.dhash,
      phash: media.phash,
    })
    .from(media)
    .where(eq(media.dhashBucket, hashes.dhashBucket))
    .limit(50);

  for (const row of candidates) {
    if (ownerUserId && row.ownerUserId === ownerUserId) continue;
    if (row.dhash == null || row.phash == null) continue;
    const dd = hamming64(hashes.dhash, row.dhash);
    const pd = hamming64(hashes.phash, row.phash);
    if (dd <= 8 || pd <= 8) {
      return { kind: 'DUPLICATE', mediaId: row.id, listingId: row.listingId };
    }
    if (dd <= 10 || pd <= 10) {
      return { kind: 'NEAR_DUPLICATE', mediaId: row.id, listingId: row.listingId };
    }
  }
  return null;
}

export async function recordModerationEvent(
  db: Db,
  input: {
    kind: string;
    listingId?: string | null;
    mediaId?: string | null;
    actorUserId?: string | null;
    subjectUserId?: string | null;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(moderationEvents).values({
    kind: input.kind,
    listingId: input.listingId ?? null,
    mediaId: input.mediaId ?? null,
    actorUserId: input.actorUserId ?? null,
    subjectUserId: input.subjectUserId ?? null,
    detail: input.detail ?? {},
  });
}

export function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

