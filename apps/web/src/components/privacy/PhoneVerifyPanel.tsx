'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';

/**
 * EC-12 — post-login WhatsApp/email OTP phone verification.
 * Lives on /privacy (my data) until a dedicated account page exists.
 */
export function PhoneVerifyPanel() {
  const t = useTranslations('myData.phoneVerify');
  const { getAccessToken, isAuthenticated, ready } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'email' | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!ready || !isAuthenticated) return null;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch(apiUrl('/me/phone/verify/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? t('errors.start', { status: res.status }));
      }
      const data = (await res.json()) as { channel: 'whatsapp' | 'email'; expiresAt: string };
      setChannel(data.channel);
      setExpiresAt(data.expiresAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch(apiUrl('/me/phone/verify/confirm'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? t('errors.confirm', { status: res.status }));
      }
      const data = (await res.json()) as { phoneVerifiedAt: string };
      setVerifiedAt(data.phoneVerifiedAt);
      setChannel(null);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
        {t('title')}
      </h2>
      <p className="text-sm leading-relaxed text-[var(--muted)]">{t('lead')}</p>

      {verifiedAt ? (
        <p className="text-sm text-[var(--pine)]" role="status">
          {t('verified', { at: new Date(verifiedAt).toLocaleString() })}
        </p>
      ) : (
        <div className="space-y-3 max-w-md">
          <label className="block text-sm">
            {t('phoneLabel')}
            <input
              className="mt-1 w-full rounded border border-[var(--line)] px-3 py-2"
              type="tel"
              autoComplete="tel"
              placeholder="+39…"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy || channel != null}
            />
          </label>
          {channel == null ? (
            <button
              type="button"
              disabled={busy || phone.trim().length < 8}
              onClick={() => void start()}
              className="rounded bg-[var(--azure)] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? t('sending') : t('sendCode')}
            </button>
          ) : (
            <>
              <p className="text-sm text-[var(--muted)]">
                {channel === 'whatsapp' ? t('sentWhatsapp') : t('sentEmail')}
                {expiresAt
                  ? ` ${t('expires', { at: new Date(expiresAt).toLocaleTimeString() })}`
                  : null}
              </p>
              <label className="block text-sm">
                {t('codeLabel')}
                <input
                  className="mt-1 w-full rounded border border-[var(--line)] px-3 py-2 tracking-widest"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={busy}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || code.length !== 6}
                  onClick={() => void confirm()}
                  className="rounded bg-[var(--pine)] px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {busy ? t('confirming') : t('confirm')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setChannel(null);
                    setCode('');
                    setExpiresAt(null);
                  }}
                  className="rounded border border-[var(--line)] px-4 py-2 text-sm"
                >
                  {t('restart')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {error ? (
        <p className="text-sm text-[var(--clay)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
