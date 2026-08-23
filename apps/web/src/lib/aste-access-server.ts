import { cookies } from 'next/headers';
import { isAsteEmailAllowlisted, parseAstePreviewAllowlist } from '@easycasa/shared';

import {
  asteAnalysisPublicEnabled,
  asteAnalysisRouteMounted,
  asteInternalPreviewRouteMounted,
} from '@/lib/aste-analysis-config';
import { asteMonetisationEnabled } from '@/lib/aste-monetisation-config';
import { emailFromAccessToken } from '@/lib/jwt-payload';

const ACCESS_COOKIE = 'ec_access';

async function sessionEmail(): Promise<string | undefined> {
  const jar = await cookies();
  const raw = jar.get(ACCESS_COOKIE)?.value;
  const token = raw ? decodeURIComponent(raw) : undefined;
  return emailFromAccessToken(token);
}

/** Server-side allowlist gate for analisi routes (EC-36). */
export async function asteAnalysisServerAccessAllowed(): Promise<boolean> {
  if (asteAnalysisPublicEnabled()) return true;
  if (process.env.ASTE_INTERNAL_PREVIEW !== 'true') return false;
  if (!asteInternalPreviewRouteMounted()) return false;

  const email = await sessionEmail();
  return isAsteEmailAllowlisted(email, process.env.ASTE_INTERNAL_PREVIEW_EMAILS);
}

/** Redirect/404 guard for App Router analisi pages. */
export async function asteAnalysisRouteAllowed(): Promise<boolean> {
  if (!asteAnalysisPublicEnabled() && !asteInternalPreviewRouteMounted()) {
    return false;
  }
  return asteAnalysisServerAccessAllowed();
}

/** Diagnostics for the internal Aste lab UI (no secrets / no allowlist emails). */
export type AsteLabGateState = {
  routeMounted: boolean;
  publicEnabled: boolean;
  previewBuildMounted: boolean;
  previewRuntimeOn: boolean;
  allowlistConfigured: boolean;
  signedIn: boolean;
  sessionAllowlisted: boolean;
  canOpenAnalisi: boolean;
  monetisationEnabled: boolean;
};

export async function getAsteLabGateState(): Promise<AsteLabGateState> {
  const publicEnabled = asteAnalysisPublicEnabled();
  const previewBuildMounted = asteInternalPreviewRouteMounted();
  const previewRuntimeOn = process.env.ASTE_INTERNAL_PREVIEW === 'true';
  const allowlistConfigured =
    parseAstePreviewAllowlist(process.env.ASTE_INTERNAL_PREVIEW_EMAILS).length > 0;
  const email = await sessionEmail();
  const signedIn = Boolean(email);
  const sessionAllowlisted = isAsteEmailAllowlisted(
    email,
    process.env.ASTE_INTERNAL_PREVIEW_EMAILS,
  );
  const canOpenAnalisi = await asteAnalysisRouteAllowed();

  return {
    routeMounted: asteAnalysisRouteMounted(),
    publicEnabled,
    previewBuildMounted,
    previewRuntimeOn,
    allowlistConfigured,
    signedIn,
    sessionAllowlisted,
    canOpenAnalisi,
    monetisationEnabled: asteMonetisationEnabled(),
  };
}

export { ACCESS_COOKIE as ASTE_ACCESS_COOKIE };
