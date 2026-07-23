'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { RequireSignInLink } from '@/components/AuthControls';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

type Props = {
  listingId: string;
  listingTitle: string;
};

type ConsentPurpose = 'privacy_policy' | 'mediation_disclosure';

/**
 * Contact-agent CTA — Phase 37/38. Records required consents then posts enquiry.
 * Requires OIDC PKCE sign-in (Authorization: Bearer).
 */
export function ContactEnquiryForm({ listingId, listingTitle }: Props) {
  const { getAccessToken, isAuthenticated, ready } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const [message, setMessage] = useState(`Sono interessato/a a: ${listingTitle}`);
  const [email, setEmail] = useState('');
  const [privacyOk, setPrivacyOk] = useState(false);
  const [mediationOk, setMediationOk] = useState(false);
  const [policyVersion, setPolicyVersion] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function fetchPolicyVersion(): Promise<string> {
    const res = await authedFetch(apiUrl('/me/privacy/policy-version'));
    if (!res.ok) throw new Error(`Versione policy non disponibile (${res.status})`);
    const body = (await res.json()) as { policyVersion?: string };
    if (!body.policyVersion) throw new Error('Versione policy non disponibile');
    return body.policyVersion;
  }

  async function recordConsent(purpose: ConsentPurpose, version: string) {
    const res = await authedFetch(apiUrl('/me/privacy/consents'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose, granted: true, policyVersion: version }),
    });
    if (!res.ok) throw new Error(`Consenso non registrato (${res.status})`);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('Accedi per inviare la richiesta.');
      setStatus('err');
      return;
    }
    if (!privacyOk || !mediationOk) {
      setError('Accetta informativa privacy e disclosure di mediazione per continuare.');
      setStatus('err');
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Sessione scaduta. Accedi di nuovo.');
      }

      const version = policyVersion ?? (await fetchPolicyVersion());
      if (!policyVersion) setPolicyVersion(version);

      await recordConsent('privacy_policy', version);
      await recordConsent('mediation_disclosure', version);

      const res = await authedFetch(apiUrl(`/listings/${encodeURIComponent(listingId)}/enquiries`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'info',
          message,
          contactEmail: email,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
        const msg = Array.isArray(body?.message)
          ? body.message.join(', ')
          : (body?.message ?? `Errore ${res.status}`);
        throw new Error(msg);
      }
      setStatus('ok');
    } catch (err) {
      setStatus('err');
      setError(err instanceof Error ? err.message : 'Invio non riuscito');
    }
  }

  if (status === 'ok') {
    return (
      <p className="mt-8 text-pine font-[var(--font-display)] text-lg" role="status">
        Richiesta inviata. Ti contatteremo a breve.
      </p>
    );
  }

  if (ready && !isAuthenticated) {
    return (
      <div className="mt-8 max-w-md">
        <RequireSignInLink />
      </div>
    );
  }

  const versionLabel = policyVersion ?? '…';

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-md space-y-4">
      <Field label="La tua email">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </Field>
      <Field label="Messaggio">
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
          Ho letto l&apos;
          <a className="underline" href="/it/legal/privacy" target="_blank" rel="noreferrer">
            informativa privacy
          </a>{' '}
          (versione {versionLabel}).
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
          Prendo visione della{' '}
          <a className="underline" href="/it/legal/mediation" target="_blank" rel="noreferrer">
            disclosure di mediazione e provvigione
          </a>
          .
        </span>
      </label>

      {error ? <p className="text-sm text-muted">{error}</p> : null}
      <Button type="submit" disabled={status === 'sending' || !privacyOk || !mediationOk}>
        {status === 'sending' ? 'Invio…' : 'Contatta'}
      </Button>
    </form>
  );
}
