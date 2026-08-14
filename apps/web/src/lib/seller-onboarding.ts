/**
 * EC-S PP-4 — seller onboarding form state + validation (K EC 1.47).
 * Pure helpers for vitest; UI mounts SellerOnboardingForm.
 */

export type SellerConsentDecision = 'ok' | 'notice' | 'reacceptance_required' | 'invalid';

export type SellerConsentStatus = {
  decision: SellerConsentDecision;
  mayProceed: boolean;
  acceptedVersion: string | null;
  currentVersion: string;
};

export type SellerProfileView = {
  userId: string;
  displayName: string;
  phone: string | null;
  informativaVersionAccepted: string;
  acceptedAt: string;
  marketingConsent: boolean;
};

export type SellerMeResponse = {
  profile: SellerProfileView | null;
  consent: SellerConsentStatus;
};

export type SellerInformativaResponse = {
  version: string;
  layer1Key: string;
  ready: boolean;
  consentDecision: SellerConsentDecision;
};

export type OnboardingFormValues = {
  displayName: string;
  phone: string;
  marketingConsent: boolean;
};

export type OnboardingFieldErrors = Partial<Record<'displayName' | 'phone' | 'informativa', string>>;

export type WizardEntryPhase =
  | 'loading'
  | 'sign_in'
  | 'flag_off'
  | 'onboarding'
  | 'consent_blocked'
  | 'wizard';

/** Client-side validation before POST /seller/onboarding. */
export function validateOnboardingForm(values: OnboardingFormValues): {
  ok: boolean;
  errors: OnboardingFieldErrors;
} {
  const errors: OnboardingFieldErrors = {};
  const name = values.displayName.trim();
  if (!name) errors.displayName = 'displayNameRequired';
  return { ok: Object.keys(errors).length === 0, errors };
}

export function buildOnboardingPayload(values: OnboardingFormValues): {
  displayName: string;
  phone?: string;
  marketingConsent?: boolean;
} {
  const displayName = values.displayName.trim();
  const phone = values.phone.trim();
  const payload: {
    displayName: string;
    phone?: string;
    marketingConsent?: boolean;
  } = { displayName };
  if (phone) payload.phone = phone;
  if (values.marketingConsent) payload.marketingConsent = true;
  return payload;
}

/**
 * Decide whether the listing wizard should show sign-in, onboarding, or the draft UI.
 * Version mismatch after profile exists is handled by SellerConsentUpdate (T32 interstitial).
 */
export function resolveWizardEntryPhase(input: {
  ready: boolean;
  isAuthenticated: boolean;
  flagOff: boolean;
  profile: SellerProfileView | null | undefined;
  consent: SellerConsentStatus | null | undefined;
  loading: boolean;
}): WizardEntryPhase {
  if (!input.ready || input.loading) return 'loading';
  if (!input.isAuthenticated) return 'sign_in';
  if (input.flagOff) return 'flag_off';
  if (!input.profile) return 'onboarding';
  if (input.consent && !input.consent.mayProceed) return 'consent_blocked';
  return 'wizard';
}

/** Informativa version must be present before onboarding can be submitted. */
export function informativaReadyForOnboarding(info: SellerInformativaResponse | null): boolean {
  if (!info) return false;
  const version = info.version.trim();
  return version.length > 0 && info.consentDecision !== 'invalid';
}
