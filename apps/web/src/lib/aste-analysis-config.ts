/** EC-22 — dark Analisi Aste UI flag (build-time). Default off. */
export function asteAnalysisEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED === 'true';
}
