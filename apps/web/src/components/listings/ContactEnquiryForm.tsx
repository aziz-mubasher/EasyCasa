'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { RequireSignInLink } from '@/components/AuthControls';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

type Props = {
  listingId: string;
  listingTitle: string;
  className?: string;
};

type ConsentPurpose = 'privacy_policy' | 'mediation_disclosure';

const PHONE_PATTERN = /^[\d\s+().-]{6,40}$/;

function isPlausiblePhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (!PHONE_PATTERN.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 6;
}

/**
 * Contact-agent CTA — Phase 37/38. Records required consents then posts enquiry.
 * Requires OIDC PKCE sign-in (Authorization: Bearer).
 */
export function ContactEnquiryForm({ listingId, listingTitle, className = '' }: Props) {
  const locale = useLocale();
  const t = useTranslations('listingDetail.contact.enquiry');
  const { getAccessToken, isAuthenticated, ready } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappOnPhone, setWhatsappOnPhone] = useState(false);
  const [privacyOk, setPrivacyOk] = useState(false);
  const [mediationOk, setMediationOk] = useState(false);
  const [policyVersion, setPolicyVersion] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessage(t('defaultMessage', { title: listingTitle }));
  }, [listingTitle, t]);

  useEffect(() => {
    if (!phone.trim()) setWhatsappOnPhone(false);
  }, [phone]);

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
    if (!isPlausiblePhone(phone)) {
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

      const trimmedPhone = phone.trim();
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
        if (whatsappOnPhone) body.contactWhatsappAvailable = true;
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
      <Field label={t('phoneLabel')} hint={t('phoneHint')}>
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('phonePlaceholder')}
          maxLength={40}
          aria-invalid={error === t('errorPhoneInvalid') ? true : undefined}
        />
      </Field>
      <label className={`flex gap-3 items-start text-sm leading-snug ${phone.trim() ? '' : 'opacity-60'}`}>
        <input
          type="checkbox"
          className="mt-1"
          checked={whatsappOnPhone}
          disabled={!phone.trim()}
          onChange={(e) => setWhatsappOnPhone(e.target.checked)}
        />
        <span>{t('whatsappLabel')}</span>
      </label>
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

      <label className="flex gap-3 items-start text-sm leading-snug">
        <input
          type="checkbox"
          className="mt-1"
          checked={privacyOk}
          onChange={(e) => setPrivacyOk(e.target.checked)}
          required
        />
        <span>
          {t('privacyConsentBefore')}
          <a className="underline" href={privacyHref} target="_blank" rel="noreferrer">
            {t('privacyLink')}
          </a>
          {t('privacyConsentAfter', { version: versionLabel })}
        </span>
      </label>

      <label className="flex gap-3 items-start text-sm leading-snug">
        <input
          type="checkbox"
          className="mt-1"
          checked={mediationOk}
          onChange={(e) => setMediationOk(e.target.checked)}
          required
        />
        <span>
          {t('mediationConsentBefore')}
          <a className="underline" href={mediationHref} target="_blank" rel="noreferrer">
            {t('mediationLink')}
          </a>
          {t('mediationConsentAfter')}
        </span>
      </label>

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
