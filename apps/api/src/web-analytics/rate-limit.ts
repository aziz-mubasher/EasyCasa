const WINDOW_MS = 60_000;
const LIMIT = 120;
const buckets = new Map<string, number[]>();

/** In-memory limit keyed by an already-truncated address. The key is never logged. */
export function allowCollect(key: string, now = Date.now()): boolean {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}

export function resetCollectLimits(): void {
  buckets.clear();
}
