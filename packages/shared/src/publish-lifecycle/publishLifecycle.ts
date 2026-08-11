/**
 * EC-S-T13 — listing publish lifecycle (@easycasa/shared).
 *
 * Closes the last Phase 1 leftover and the T17 `daysOnMarket` honesty caveat.
 *
 * INVARIANT (trust signal, not cosmetics): `firstPublishedAt` is written once
 * and never reset — unpublish/republish cycles must not launder days-on-market
 * (relist-reset prevention is a P3 genuineness promise, T17 chip source).
 */

export const PUBLISH_STATES = ['draft', 'published', 'unpublished'] as const;
export type PublishState = (typeof PUBLISH_STATES)[number];

export type PublishEventType = 'PUBLISH' | 'UNPUBLISH';

export interface PublishRecord {
  state: PublishState;
  /** Set on first PUBLISH only. Immutable thereafter. */
  firstPublishedAt: Date | null;
  /** Updated on every PUBLISH (current live span start). */
  lastPublishedAt: Date | null;
  unpublishedAt: Date | null;
}

export function initialPublishRecord(): PublishRecord {
  return { state: 'draft', firstPublishedAt: null, lastPublishedAt: null, unpublishedAt: null };
}

export class PublishTransitionError extends Error {
  constructor(state: PublishState, event: PublishEventType) {
    super(`publish transition ${event} invalid from "${state}"`);
    this.name = 'PublishTransitionError';
  }
}

export function applyPublish(rec: PublishRecord, now: Date): PublishRecord {
  if (rec.state === 'published') throw new PublishTransitionError(rec.state, 'PUBLISH');
  return {
    state: 'published',
    firstPublishedAt: rec.firstPublishedAt ?? now, // never overwritten
    lastPublishedAt: now,
    unpublishedAt: null,
  };
}

export function applyUnpublish(rec: PublishRecord, now: Date): PublishRecord {
  if (rec.state !== 'published') throw new PublishTransitionError(rec.state, 'UNPUBLISH');
  return { ...rec, state: 'unpublished', unpublishedAt: now };
}

/**
 * Honest days-on-market: whole days since FIRST publication, regardless of
 * relists. null when never published. UTC-day floor (display granularity;
 * no timezone bucketing needed at day scale — documented product decision).
 */
export function daysOnMarket(rec: PublishRecord, now: Date): number | null {
  if (!rec.firstPublishedAt) return null;
  const ms = now.getTime() - rec.firstPublishedAt.getTime();
  return ms < 0 ? 0 : Math.floor(ms / 86_400_000);
}

/** Chip visibility: only published listings show market-time. */
export function showDaysOnMarket(rec: PublishRecord): boolean {
  return rec.state === 'published' && rec.firstPublishedAt !== null;
}
