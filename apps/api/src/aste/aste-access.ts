import { asteAnalysisPipelineActive, asteUserAnalysisAccess, type AsteAccessInput } from '@easycasa/shared';

import type { ApiConfig } from '../config';

export function asteAccessInputFromConfig(config: ApiConfig): AsteAccessInput {
  return {
    publicEnabled: config.ASTE_ANALYSIS_ENABLED,
    internalPreview: config.ASTE_INTERNAL_PREVIEW,
    allowlistRaw: config.ASTE_INTERNAL_PREVIEW_EMAILS,
  };
}

export function asteUserHasAnalysisAccess(config: ApiConfig, email: string | undefined): boolean {
  return asteUserAnalysisAccess(asteAccessInputFromConfig(config), email);
}

export function astePipelineShouldRun(config: ApiConfig): boolean {
  return asteAnalysisPipelineActive(asteAccessInputFromConfig(config));
}

export function stripeSecretKeyIsLive(secretKey: string): boolean {
  return secretKey.trim().startsWith('sk_live_');
}

/** EC-36 — block accidental real charges during internal preview. */
export function asteCreditsCheckoutBlockedByLiveKey(config: ApiConfig): boolean {
  return !config.ASTE_ANALYSIS_ENABLED && stripeSecretKeyIsLive(config.STRIPE_SECRET_KEY);
}
