/**
 * EC-S PP-4 / K EC 1.47 — seller onboarding validation + wizard entry phase.
 */

import { describe, expect, it } from 'vitest';

import {
  buildOnboardingPayload,
  informativaReadyForOnboarding,
  resolveWizardEntryPhase,
  validateOnboardingForm,
  type SellerConsentStatus,
  type SellerInformativaResponse,
} from './seller-onboarding';

const okConsent: SellerConsentStatus = {
  decision: 'ok',
  mayProceed: true,
  acceptedVersion: 'v1.1',
  currentVersion: 'v1.1',
};

describe('validateOnboardingForm (PP-4)', () => {
  it('requires display name', () => {
    const out = validateOnboardingForm({ displayName: '  ', phone: '', marketingConsent: false });
    expect(out.ok).toBe(false);
    expect(out.errors.displayName).toBe('displayNameRequired');
  });

  it('accepts trimmed display name and optional phone', () => {
    const out = validateOnboardingForm({
      displayName: ' Ada ',
      phone: '+390000000000',
      marketingConsent: true,
    });
    expect(out.ok).toBe(true);
    expect(out.errors).toEqual({});
  });
});

describe('buildOnboardingPayload (PP-4)', () => {
  it('omits phone and marketing when empty / false', () => {
    expect(buildOnboardingPayload({ displayName: 'Ada', phone: '  ', marketingConsent: false })).toEqual({
      displayName: 'Ada',
    });
  });

  it('includes optional fields when set', () => {
    expect(
      buildOnboardingPayload({
        displayName: 'Ada',
        phone: '+39 000',
        marketingConsent: true,
      }),
    ).toEqual({
      displayName: 'Ada',
      phone: '+39 000',
      marketingConsent: true,
    });
  });
});

describe('informativaReadyForOnboarding (PP-4)', () => {
  it('rejects empty or invalid version', () => {
    expect(informativaReadyForOnboarding(null)).toBe(false);
    expect(
      informativaReadyForOnboarding({
        version: '',
        layer1Key: 'x',
        ready: false,
        consentDecision: 'invalid',
      }),
    ).toBe(false);
  });

  it('accepts parseable version with non-invalid decision', () => {
    const info: SellerInformativaResponse = {
      version: 'v1.1',
      layer1Key: 'seller.informativa.v1.1',
      ready: true,
      consentDecision: 'ok',
    };
    expect(informativaReadyForOnboarding(info)).toBe(true);
  });
});

describe('resolveWizardEntryPhase (PP-4 flow)', () => {
  it('routes unauthenticated users to sign-in', () => {
    expect(
      resolveWizardEntryPhase({
        ready: true,
        isAuthenticated: false,
        flagOff: false,
        profile: null,
        consent: null,
        loading: false,
      }),
    ).toBe('sign_in');
  });

  it('preserves flag-off behaviour', () => {
    expect(
      resolveWizardEntryPhase({
        ready: true,
        isAuthenticated: true,
        flagOff: true,
        profile: null,
        consent: null,
        loading: false,
      }),
    ).toBe('flag_off');
  });

  it('shows onboarding when profile is missing', () => {
    expect(
      resolveWizardEntryPhase({
        ready: true,
        isAuthenticated: true,
        flagOff: false,
        profile: null,
        consent: okConsent,
        loading: false,
      }),
    ).toBe('onboarding');
  });

  it('defers version mismatch to consent shell (consent_blocked placeholder)', () => {
    expect(
      resolveWizardEntryPhase({
        ready: true,
        isAuthenticated: true,
        flagOff: false,
        profile: {
          userId: 'u1',
          displayName: 'Ada',
          phone: null,
          informativaVersionAccepted: 'v1.0',
          acceptedAt: '2026-08-01T00:00:00.000Z',
          marketingConsent: false,
        },
        consent: {
          decision: 'reacceptance_required',
          mayProceed: false,
          acceptedVersion: 'v1.0',
          currentVersion: 'v2.0',
        },
        loading: false,
      }),
    ).toBe('consent_blocked');
  });

  it('enters wizard when profile + consent allow proceed', () => {
    expect(
      resolveWizardEntryPhase({
        ready: true,
        isAuthenticated: true,
        flagOff: false,
        profile: {
          userId: 'u1',
          displayName: 'Ada',
          phone: null,
          informativaVersionAccepted: 'v1.1',
          acceptedAt: '2026-08-01T00:00:00.000Z',
          marketingConsent: false,
        },
        consent: okConsent,
        loading: false,
      }),
    ).toBe('wizard');
  });
});
