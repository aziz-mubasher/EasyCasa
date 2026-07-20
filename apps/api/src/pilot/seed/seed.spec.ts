import { describe, expect, it } from 'vitest';

import { PILOT_LISTINGS, seedPilotListings, type ListingSink, type PilotListing } from './seed';

class MemSink implements ListingSink {
  rows = new Map<string, PilotListing>();
  async upsertByWpKey(l: PilotListing) {
    this.rows.set(l.wpKey, l);
  }
  async countByWpKeyPrefix(p: string) {
    return [...this.rows.keys()].filter((k) => k.startsWith(p)).length;
  }
}

describe('pilot seed', () => {
  it('loads all curated listings', async () => {
    const sink = new MemSink();
    const n = await seedPilotListings(sink);
    expect(n).toBe(PILOT_LISTINGS.length);
    expect(sink.rows.size).toBe(PILOT_LISTINGS.length);
  });

  it('is idempotent (re-run upserts, no duplicates)', async () => {
    const sink = new MemSink();
    await seedPilotListings(sink);
    await seedPilotListings(sink);
    expect(sink.rows.size).toBe(PILOT_LISTINGS.length);
    expect(await sink.countByWpKeyPrefix('pilot-milano')).toBe(PILOT_LISTINGS.length);
  });
});
