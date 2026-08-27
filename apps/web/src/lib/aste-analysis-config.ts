/** EC-22 / EC-36 — Legenda UI flags (build-time + server runtime). */

/** Public G2 switch — when true, all authenticated users see Aste analysis. */
export function asteAnalysisPublicEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED === 'true';
}

/** EC-36 — mount dark analisi routes at build time for internal preview (auth still server-gated). */
export function asteInternalPreviewRouteMounted(): boolean {
  return process.env.NEXT_PUBLIC_ASTE_INTERNAL_PREVIEW === 'true';
}

/** Legacy alias — true when public flag is on (not preview-only). */
export function asteAnalysisEnabled(): boolean {
  return asteAnalysisPublicEnabled();
}

/** Route exists in the Next bundle (public or preview build arg). */
export function asteAnalysisRouteMounted(): boolean {
  return asteAnalysisPublicEnabled() || asteInternalPreviewRouteMounted();
}
