'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';

type Props = {
  listingId: string;
  listingTitle: string;
};

/**
 * Contact-agent CTA — Phase 37. Posts to POST /listings/:id/enquiries.
 * Uses DEV_AUTH headers until web PKCE (Phase 35 client) lands.
 */
export function ContactEnquiryForm({ listingId, listingTitle }: Props) {
  const [message, setMessage] = useState(`Sono interessato/a a: ${listingTitle}`);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch(`${API}/listings/${encodeURIComponent(listingId)}/enquiries`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-dev-user': 'seeker-web',
          'x-dev-email': email,
          'x-dev-roles': 'buyer',
        },
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
      {error ? <p className="text-sm text-muted">{error}</p> : null}
      <Button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Invio…' : 'Contatta'}
      </Button>
    </form>
  );
}
