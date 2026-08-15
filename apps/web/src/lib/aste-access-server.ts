import { cookies } from 'next/headers';
import { isAsteEmailAllowlisted } from '@easycasa/shared';

import {
  asteAnalysisPublicEnabled,
  asteInternalPreviewRouteMounted,
} from '@/lib/aste-analysis-config';
import { emailFromAccessToken } from '@/lib/jwt-payload';

const ACCESS_COOKIE = 'ec_access';

/** Server-side allowlist gate for analisi routes (EC-36). */
export async function asteAnalysisServerAccessAllowed(): Promise<boolean> {
  if (asteAnalysisPublicEnabled()) return true;
  if (process.env.ASTE_INTERNAL_PREVIEW !== 'true') return false;
  if (!asteInternalPreviewRouteMounted()) return false;

  const jar = await cookies();
  const raw = jar.get(ACCESS_COOKIE)?.value;
  const token = raw ? decodeURIComponent(raw) : undefined;
  const email = emailFromAccessToken(token);
  return isAsteEmailAllowlisted(email, process.env.ASTE_INTERNAL_PREVIEW_EMAILS);
}

/** Redirect/404 guard for App Router analisi pages. */
export async function asteAnalysisRouteAllowed(): Promise<boolean> {
  if (!asteAnalysisPublicEnabled() && !asteInternalPreviewRouteMounted()) {
    return false;
  }
  return asteAnalysisServerAccessAllowed();
}

export { ACCESS_COOKIE as ASTE_ACCESS_COOKIE };
