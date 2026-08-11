'use client';

/**
 * EC-S-T32 / T30 — seller informativa update UX.
 * - notice (minor bump): non-blocking banner
 * - reacceptance_required (major bump): blocking interstitial
 * - invalid: integrity error (no accept)
 *
 * Source of truth: GET /seller/me → consent; accept via POST /seller/informativa/accept.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';

type ConsentDecision = 'ok' | 'notice' | 'reacceptance_required' | 'invalid';

type SellerConsentStatus = {
  decision: ConsentDecision;
  mayProceed: boolean;
  acceptedVersion: string | null;
  currentVersion: string;
};

type MeResponse = {
  profile: { userId: string } | null;
  consent: SellerConsentStatus;
};

function noticeDismissKey(version: string): string {
  return `ecs:consentNoticeDismissed:${version}`;
}

function laterKey(version: string): string {
  return `ecs:consentLater:${version}`;
}

export function SellerConsentUpdate() {
  const t = useTranslations('consentUpdate');
  const { ready, isAuthenticated, getAccessToken } = useAuth();
  const [consent, setConsent] = useState<SellerConsentStatus | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [noticeHidden, setNoticeHidden] = useState(false);
  const [laterHidden, setLaterHidden] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState(false);

  const refresh = useCallback(async () => {
    if (!ready || !isAuthenticated) {
      setConsent(null);
      setHasProfile(false);
      return;
    }
    const fetchAuth = createAuthedFetch(getAccessToken);
    const res = await fetchAuth(apiUrl('/seller/me'));
    if (res.status === 404) {
      // Seller onboarding flag off — no surface.
      setConsent(null);
      return;
    }
    if (!res.ok) return;
    const body = (await res.json()) as MeResponse;
    setHasProfile(body.profile != null);
    setConsent(body.consent);
    if (typeof window !== 'undefined' && body.consent.currentVersion) {
      setNoticeHidden(
        sessionStorage.getItem(noticeDismissKey(body.consent.currentVersion)) === '1',
      );
      setLaterHidden(sessionStorage.getItem(laterKey(body.consent.currentVersion)) === '1');
    }
  }, [ready, isAuthenticated, getAccessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const accept = useCallback(async () => {
    setAccepting(true);
    setAcceptError(false);
    try {
      const fetchAuth = createAuthedFetch(getAccessToken);
      const res = await fetchAuth(apiUrl('/seller/informativa/accept'), { method: 'POST' });
      if (!res.ok) {
        setAcceptError(true);
        return;
      }
      const body = (await res.json()) as MeResponse;
      setConsent(body.consent);
      setHasProfile(body.profile != null);
      setLaterHidden(false);
    } catch {
      setAcceptError(true);
    } finally {
      setAccepting(false);
    }
  }, [getAccessToken]);

  if (!ready || !isAuthenticated || !consent || !hasProfile) return null;
  if (consent.decision === 'ok') return null;

  const version = consent.currentVersion || '—';

  if (consent.decision === 'notice' && !noticeHidden) {
    return (
      <aside
        role="status"
        data-testid="consent-update-banner"
        className="seller-consent-banner"
        style={{
          background: 'var(--color-surface-muted, #f3f1ec)',
          borderBottom: '1px solid var(--color-border, #ddd)',
          padding: '0.75rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <p style={{ margin: 0, flex: '1 1 16rem' }}>
          {t('bannerText', { version })}{' '}
          <Link href="/legal/privacy">{t('bannerLink')}</Link>
        </p>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(noticeDismissKey(version), '1');
            setNoticeHidden(true);
          }}
        >
          {t('bannerDismiss')}
        </button>
      </aside>
    );
  }

  if (
    (consent.decision === 'reacceptance_required' || consent.decision === 'invalid') &&
    !laterHidden
  ) {
    const isInvalid = consent.decision === 'invalid';
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-update-title"
        data-testid="consent-update-interstitial"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
          background: 'rgba(20, 18, 14, 0.55)',
          display: 'grid',
          placeItems: 'center',
          padding: '1rem',
        }}
      >
        <div
          style={{
            background: 'var(--color-surface, #fff)',
            maxWidth: '28rem',
            width: '100%',
            padding: '1.5rem',
            borderRadius: '4px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          <h2 id="consent-update-title" style={{ marginTop: 0 }}>
            {t('interstitialTitle')}
          </h2>
          {isInvalid ? (
            <p>{t('errorIntegrity')}</p>
          ) : (
            <p>{t('interstitialBody', { version })}</p>
          )}
          <p>
            <Link href="/legal/privacy">{t('interstitialReadLink')}</Link>
          </p>
          {acceptError && !isInvalid ? <p>{t('errorIntegrity')}</p> : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
            {!isInvalid ? (
              <button type="button" disabled={accepting} onClick={() => void accept()}>
                {t('interstitialAccept')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem(laterKey(version), '1');
                setLaterHidden(true);
              }}
            >
              {t('interstitialLater')}
            </button>
          </div>
          <p style={{ fontSize: '0.9rem', opacity: 0.85, marginBottom: 0 }}>
            {t('interstitialLaterNote')}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
