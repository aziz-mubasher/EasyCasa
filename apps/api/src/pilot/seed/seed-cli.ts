import { seedPilotListings, type ListingSink } from './seed';

/**
 * Runnable pilot seed — Phase 40. Wraps the Phase 37 idempotent loader as an
 * entrypoint. Provide a real `ListingSink` (backed by the listings repo,
 * upserting on wp_key) via `makeSink`. Kept sink-agnostic so this file has no DB
 * import and stays unit-testable; the repo wires the concrete sink via
 * `run-seed.ts` or `POST /admin/pilot/seed`.
 */
export async function runSeed(
  makeSink: () => Promise<ListingSink> | ListingSink,
): Promise<number> {
  const sink = await makeSink();
  const n = await seedPilotListings(sink);
  console.log(`pilot seed: upserted ${n} listings`);
  return n;
}
