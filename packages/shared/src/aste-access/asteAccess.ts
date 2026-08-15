/** EC-36 — allowlist parsing + access helpers (API + web server). */

export function parseAstePreviewAllowlist(raw: string | undefined): readonly string[] {
  if (!raw?.trim()) return [];
  return Object.freeze(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAsteEmailAllowlisted(
  email: string | undefined,
  allowlistRaw: string | undefined,
): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  const allowlist = parseAstePreviewAllowlist(allowlistRaw);
  return allowlist.includes(normalized);
}

export type AsteAccessInput = {
  publicEnabled: boolean;
  internalPreview: boolean;
  allowlistRaw: string | undefined;
};

/** User-facing analysis surface: public on, or internal preview + allowlisted email. */
export function asteUserAnalysisAccess(
  config: AsteAccessInput,
  email: string | undefined,
): boolean {
  if (config.publicEnabled) return true;
  if (!config.internalPreview) return false;
  return isAsteEmailAllowlisted(email, config.allowlistRaw);
}

/** Pipeline / schedulers: public on, or preview mode configured with a non-empty allowlist. */
export function asteAnalysisPipelineActive(config: AsteAccessInput): boolean {
  if (config.publicEnabled) return true;
  if (!config.internalPreview) return false;
  return parseAstePreviewAllowlist(config.allowlistRaw).length > 0;
}
