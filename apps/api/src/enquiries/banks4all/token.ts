const PIP_PLAN_REF = /^PIP-\d{4}-\d+$/i;

/** True when the value looks like a sequential plan reference (not a tracking token). */
export function isPipPlanRefFormat(value: string): boolean {
  return PIP_PLAN_REF.test(value.trim());
}

/**
 * Accept a full tracking URL or bare token; return the last path segment.
 * Returns null when empty / unusable.
 */
export function extractBanks4AllTrackingToken(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const parts = url.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1] ?? '';
      return last.trim() || null;
    }
  } catch {
    /* fall through — treat as bare token */
  }

  // Bare path like /it/property-plan/track/abc…
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/').filter(Boolean);
    const last = parts[parts.length - 1] ?? '';
    return last.trim() || null;
  }

  return trimmed;
}
