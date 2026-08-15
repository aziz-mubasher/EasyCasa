/** EC-27 — dual-flag gate for Aste monetisation (teaser/full + credits). */
import { asteAnalysisEnabled } from '@/lib/aste-analysis-config';
import { paymentsEnabled } from '@/lib/payments-config';

export function asteMonetisationEnabled(): boolean {
  return asteAnalysisEnabled() && paymentsEnabled();
}
