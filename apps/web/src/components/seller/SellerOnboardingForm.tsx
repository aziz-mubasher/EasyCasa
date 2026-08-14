'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Link } from '@/i18n/routing';
import {
  buildOnboardingPayload,
  informativaReadyForOnboarding,
  validateOnboardingForm,
  type SellerInformativaResponse,
  type SellerMeResponse,
} from '@/lib/seller-onboarding';

type Props = {
  /** Called after successful POST /seller/onboarding with fresh profile + consent. */
  onComplete?: (body: SellerMeResponse) => void;
  /** Compact layout for wizard embed; full page uses default spacing. */
  variant?: 'embedded' | 'page';
};

/**
 * EC-S PP-4 / K EC 1.47 — web onboarding for POST /seller/onboarding.
 * Layer 1 informativa acceptance is recorded on submit (T05 / T06 — no separate checkbox).
 * Version bumps after onboarding use SellerConsentUpdate (T32).
 */
export function SellerOnboardingForm({ onComplete, variant = 'page' }: Props) {
  const t = useTranslations('sellerOnboarding');
  const { getAccessToken } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [informativa, setInformativa] = useState<SellerInformativaResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingInformativa, setLoadingInformativa] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingInformativa(true);
      try {
        const res = await authedFetch(apiUrl('/seller/informativa'));
        if (cancelled) return;
        if (!res.ok) {
          setInformativa(null);
          return;
        }
        setInformativa((await res.json()) as SellerInformativaResponse);
      } finally {
        if (!cancelled) setLoadingInformativa(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  const version = informativa?.version?.trim() || '—';
  const informativaOk = informativaReadyForOnboarding(informativa);

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      const check = validateOnboardingForm({ displayName, phone, marketingConsent });
      if (!check.ok) {
        setFieldErrors(check.errors);
        return;
      }
      if (!informativaOk) {
        setSubmitError('versionMissing');
        return;
      }
      setFieldErrors({});
      setBusy(true);
      try {
        const res = await authedFetch(apiUrl('/seller/onboarding'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildOnboardingPayload({ displayName, phone, marketingConsent })),
        });
        if (res.status === 400) {
          setSubmitError('submitFailed');
          return;
        }
        if (!res.ok) {
          setSubmitError('submitFailed');
          return;
        }
        const body = (await res.json()) as SellerMeResponse;
        onComplete?.(body);
      } catch {
        setSubmitError('submitFailed');
      } finally {
        setBusy(false);
      }
    },
    [authedFetch, displayName, phone, marketingConsent, informativaOk, onComplete],
  );

  const wrapClass =
    variant === 'embedded'
      ? 'mx-auto max-w-xl px-4 py-8'
      : 'mx-auto max-w-xl px-4 py-12';

  return (
    <div className={wrapClass} data-testid="seller-onboarding-form">
      <h1 className="font-display text-3xl">{t('title')}</h1>
      <p className="mt-2 text-muted text-sm max-w-lg">{t('lead')}</p>

      <form className="mt-8 space-y-5" onSubmit={(e) => void submit(e)} noValidate>
        <Field label={t('fields.displayName')}>
          <Input
            value={displayName}
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.displayName)}
            aria-describedby={fieldErrors.displayName ? 'onboarding-name-error' : undefined}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          {fieldErrors.displayName ? (
            <p id="onboarding-name-error" className="mt-1 text-sm text-terracotta">
              {t(`errors.${fieldErrors.displayName}`)}
            </p>
          ) : null}
        </Field>

        <Field label={t('fields.phone')}>
          <Input
            type="tel"
            value={phone}
            autoComplete="tel"
            placeholder={t('fields.phonePlaceholder')}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted">{t('fields.phoneHint')}</p>
        </Field>

        <div
          className="rounded border border-border bg-surface-muted/40 p-4 text-sm"
          data-testid="seller-onboarding-informativa"
        >
          <p>
            {loadingInformativa
              ? t('informativaLoading')
              : t('informativaNotice', { version })}
          </p>
          <p className="mt-2">
            <Link href="/legal/privacy">{t('informativaLink')}</Link>
          </p>
          {!loadingInformativa && !informativaOk ? (
            <p className="mt-2 text-terracotta">{t('errors.versionMissing')}</p>
          ) : null}
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
          />
          <span>{t('marketingLabel')}</span>
        </label>

        {submitError ? (
          <p className="text-sm text-terracotta" role="alert">
            {t(`errors.${submitError}`)}
          </p>
        ) : null}

        <Button type="submit" disabled={busy || loadingInformativa || !informativaOk}>
          {t('submit')}
        </Button>
      </form>

      <p className="mt-6 text-xs text-muted max-w-lg">{t('portalNote')}</p>
    </div>
  );
}
