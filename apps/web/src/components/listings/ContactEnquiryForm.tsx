'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';
const POLICY_VERSION = 'v1-draft';

type Props = {
  listingId: string;
  listingTitle: string;
};

function authHeaders(email: string): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-dev-user': 'seeker-web',
    'x-dev-email': email,
    'x-dev-roles': 'buyer',
  };
}

/**
 * Contact-agent CTA — Phase 37/38. Records required consents then posts enquiry.
 */
export function ContactEnquiryForm({ listingId, listingTitle }: Props) {
  const [message, setMessage] = useState(`Sono interessato/a a: ${listingTitle}`);
  const [email, setEmail] = useState('');
  const [privacyOk, setPrivacyOk] = useState(false);
  const [mediationOk, setMediationOk] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function recordConsent(purpose: 'privacy_policy' | 'mediation_disclosure', emailAddr: string) {
    const res = await fetch(`${API}/me/privacy/consents`, {
      method: 'POST',
      headers: authHeaders(emailAddr),
      body: JSON.stringify({ purpose, granted: true, policyVersion: POLICY_VERSION }),
    });
    if (!res.ok) throw new Error(`Consenso non registrato (${res.status})`);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!privacyOk || !mediationOk) {
      setError('Accetta informativa privacy e disclosure di mediazione per continuare.');
      setStatus('err');
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      await recordConsent('privacy_policy', email);
      await recordConsent('mediation_disclosure', email);

      const res = await fetch(`${API}/listings/${encodeURIComponent(listingId)}/enquiries`, {
        method: 'POST',
        headers: authHeaders(email),
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
          (versione {POLICY_VERSION}).
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
