'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { RequireSignInLink } from '@/components/AuthControls';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { DEFAULT_DIAL_CODE, ENQUIRY_DIAL_CODES } from '@/lib/enquiry-dial-codes';
import {
  composeEnquiryPhone,
  enquiryPhoneForSubmit,
  hasUsableNationalNumber,
  isPlausibleEnquiryPhone,
} from '@/lib/enquiry-phone';

type Props = {
  listingId: string;
  listingTitle: string;
  className?: string;
};

type ConsentPurpose = 'privacy_policy' | 'mediation_disclosure';

/**
 * Contact-agent CTA — Phase 37/38. Records required consents then posts enquiry.
 * Requires OIDC PKCE sign-in (Authorization: Bearer).
 */
export function ContactEnquiryForm({ listingId, listingTitle, className = '' }: Props) {
  const locale = useLocale();
  const t = useTranslations('listingDetail.contact.enquiry');
  const dialSelectId = useId();
  const { getAccessToken, isAuthenticated, ready } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [dialCode, setDialCode] = useState(DEFAULT_DIAL_CODE);
  const [nationalNumber, setNationalNumber] = useState('');
  const [whatsappOnPhone, setWhatsappOnPhone] = useState(false);
  const [privacyOk, setPrivacyOk] = useState(false);
  const [mediationOk, setMediationOk] = useState(false);
  const [policyVersion, setPolicyVersion] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [error, setError] = useState<string | null>(null);

  const phone = useMemo(
    () => composeEnquiryPhone(dialCode, nationalNumber),
    [dialCode, nationalNumber],
  );
  const phoneReady = hasUsableNationalNumber(nationalNumber);

  useEffect(() => {
    setMessage(t('defaultMessage', { title: listingTitle }));
  }, [listingTitle, t]);

  async function fetchPolicyVersion(): Promise<string> {
    const res = await authedFetch(apiUrl('/me/privacy/policy-version'));
    if (!res.ok) throw new Error(t('errorPolicyVersion'));
    const body = (await res.json()) as { policyVersion?: string };
    if (!body.policyVersion) throw new Error(t('errorPolicyVersion'));
    return body.policyVersion;
  }

  async function recordConsent(purpose: ConsentPurpose, version: string) {
    const res = await authedFetch(apiUrl('/me/privacy/consents'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose, granted: true, policyVersion: version }),
    });
    if (!res.ok) throw new Error(t('errorConsentRecord'));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      setError(t('errorSignIn'));
      setStatus('err');
      return;
    }
    if (!privacyOk || !mediationOk) {
      setError(t('errorConsent'));
      setStatus('err');
      return;
    }
    if (whatsappOnPhone && !phoneReady) {
      setError(t('errorWhatsappNeedPhone'));
      setStatus('err');
      return;
    }
    if (!isPlausibleEnquiryPhone(phone)) {
      setError(t('errorPhoneInvalid'));
      setStatus('err');
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error(t('errorSession'));
      }

      const version = policyVersion ?? (await fetchPolicyVersion());
      if (!policyVersion) setPolicyVersion(version);

      await recordConsent('privacy_policy', version);
      await recordConsent('mediation_disclosure', version);

      const trimmedPhone = enquiryPhoneForSubmit(phone);
      const body: {
        intent: 'info';
        message: string;
        contactEmail: string;
        contactPhone?: string;
        contactWhatsappAvailable?: boolean;
      } = {
        intent: 'info',
        message,
        contactEmail: email,
      };
      if (trimmedPhone) {
        body.contactPhone = trimmedPhone;
        body.contactWhatsappAvailable = whatsappOnPhone;
      }

      const res = await authedFetch(apiUrl(`/listings/${encodeURIComponent(listingId)}/enquiries`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
        const msg = Array.isArray(errBody?.message)
          ? errBody.message.join(', ')
          : (errBody?.message ?? t('errorGeneric'));
        throw new Error(msg);
      }
      setStatus('ok');
    } catch (err) {
      setStatus('err');
      setError(err instanceof Error ? err.message : t('errorGeneric'));
    }
  }

  const privacyHref = `/${locale}/legal/privacy`;
  const mediationHref = `/${locale}/legal/mediation`;

  if (status === 'ok') {
    return (
      <p className={`text-pine font-[var(--font-display)] text-lg ${className}`} role="status">
        {t('success')}
      </p>
    );
  }

  if (ready && !isAuthenticated) {
    return (
      <div className={className || 'mt-8 max-w-md'}>
        <p className="text-sm text-muted mb-3">{t('signInPrompt')}</p>
        <RequireSignInLink />
      </div>
    );
  }

  const versionLabel = policyVersion ?? '…';

  return (
    <form onSubmit={onSubmit} className={`mt-8 max-w-md space-y-4 ${className}`.trim()} noValidate>
      <Field label={t('emailLabel')}>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </Field>

      <div className="block">
        <span className="eyebrow mb-1 block">{t('phoneLabel')}</span>
        <div className="flex items-stretch overflow-hidden rounded-lg border border-line bg-paper focus-within:border-azure">
          <label htmlFor={dialSelectId} className="sr-only">
            {t('countryCodeLabel')}
          </label>
          <select
            id={dialSelectId}
            value={dialCode}
            onChange={(e) => setDialCode(e.target.value)}
            className="max-w-[7.5rem] shrink-0 border-r border-line bg-sand/40 py-2 pl-2 pr-1 text-sm font-medium text-ink focus:outline-none"
            aria-label={t('countryCodeLabel')}
          >
            {ENQUIRY_DIAL_CODES.map((opt) => (
              <option key={`${opt.code}-${opt.iso || opt.label}`} value={opt.code}>
                {opt.code} {opt.iso ? `(${opt.iso})` : ''}
              </option>
            ))}
          </select>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
            value={nationalNumber}
            onChange={(e) => setNationalNumber(e.target.value)}
            placeholder={t('phonePlaceholderLocal')}
            maxLength={36}
            aria-label={t('phoneNationalLabel')}
            aria-invalid={error === t('errorPhoneInvalid') || error === t('errorWhatsappNeedPhone') ? true : undefined}
          />
        </div>
        <span className="mt-1 block text-xs text-muted">{t('phoneHint')}</span>
      </div>

      <div className="flex gap-3 items-start text-sm leading-snug">
        <input
          id={`${dialSelectId}-whatsapp`}
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-azure"
          checked={whatsappOnPhone}
          onChange={(e) => setWhatsappOnPhone(e.target.checked)}
        />
        <label htmlFor={`${dialSelectId}-whatsapp`} className="cursor-pointer select-none">
          {t('whatsappLabel')}
          {!phoneReady && whatsappOnPhone ? (
            <span className="mt-0.5 block text-xs text-muted">{t('whatsappNeedPhone')}</span>
          ) : null}
        </label>
      </div>

      <Field label={t('messageLabel')}>
        <textarea
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm min-h-[100px]"
          required
          minLength={1}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Field>

      <div className="flex gap-3 items-start text-sm leading-snug">
        <input
          id={`${dialSelectId}-privacy`}
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-azure"
          checked={privacyOk}
          onChange={(e) => setPrivacyOk(e.target.checked)}
          required
        />
        <label htmlFor={`${dialSelectId}-privacy`} className="cursor-pointer">
          {t('privacyConsentBefore')}
          <a className="underline" href={privacyHref} target="_blank" rel="noreferrer">
            {t('privacyLink')}
          </a>
          {t('privacyConsentAfter', { version: versionLabel })}
        </label>
      </div>

      <div className="flex gap-3 items-start text-sm leading-snug">
        <input
          id={`${dialSelectId}-mediation`}
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-azure"
          checked={mediationOk}
          onChange={(e) => setMediationOk(e.target.checked)}
          required
        />
        <label htmlFor={`${dialSelectId}-mediation`} className="cursor-pointer">
          {t('mediationConsentBefore')}
          <a className="underline" href={mediationHref} target="_blank" rel="noreferrer">
            {t('mediationLink')}
          </a>
          {t('mediationConsentAfter')}
        </label>
      </div>

      {error ? (
        <p className="text-sm text-muted" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={status === 'sending' || !privacyOk || !mediationOk}>
        {status === 'sending' ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
