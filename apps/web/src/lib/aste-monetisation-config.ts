/** EC-27 — dual-flag gate for Aste monetisation (teaser/full + credits). */
import { asteAnalysisPublicEnabled, asteInternalPreviewRouteMounted } from '@/lib/aste-analysis-config';
import { paymentsEnabled } from '@/lib/payments-config';

/** EC-27 / EC-36 — credits UI when payments on and route is public or preview-mounted. */
export function asteMonetisationEnabled(): boolean {
  const routeLive = asteAnalysisPublicEnabled() || asteInternalPreviewRouteMounted();
  return routeLive && paymentsEnabled();
}
