'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PARTNER_DIRECTORY_CATEGORIES } from '@easycasa/shared';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { Button } from '@/components/ui/Button';

type PartnerEntry = {
  id: string;
  category: string;
  name: string;
  province: string;
  credentials: string | null;
  contact: string;
  active: boolean;
  paidPlacement: boolean;
};

type MeResponse = {
  entry: PartnerEntry | null;
  checkoutAvailable: boolean;
};

const EMPTY_FORM = {
  category: 'notaio',
  name: '',
  province: '',
  credentials: '',
  contact: '',
};

function rolesFromJwt(accessToken: string | null): string[] {
  if (!accessToken) return [];
  try {
    const [, payloadB64] = accessToken.split('.');
    if (!payloadB64) return [];
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { realm_access?: { roles?: unknown } };
    const roles = payload.realm_access?.roles;
    return Array.isArray(roles) ? roles.map(String) : [];
  } catch {
    return [];
  }
}

/** PP-1 — partner apply + paid placement checkout (tolerates dark/missing-price API). */
export function PartnerDirectorySelfServe() {
  const t = useTranslations('partnerDirectory.selfServe');
  const tCat = useTranslations('partnerDirectory.categories');
  const { ready, isAuthenticated, getAccessToken, signIn } = useAuth();
  const [isPartner, setIsPartner] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [apiDark, setApiDark] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState<'apply' | 'checkout' | null>(null);
  const [errorKey, setErrorKey] = useState<
    'applyFailed' | 'checkoutFailed' | 'alreadyPaid' | null
  >(null);

  const loadMe = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const roles = rolesFromJwt(token);
    const partnerLike =
      roles.includes('partner') ||
      roles.includes('pro_marketer') ||
      roles.includes('admin');
    setIsPartner(partnerLike);
    if (!partnerLike) return;

    try {
      const res = await createAuthedFetch(getAccessToken)(apiUrl('/partners/directory/me'));
      if (res.status === 404) {
        setApiDark(true);
        setMe(null);
        return;
      }
      if (res.status === 401) return;
      if (!res.ok) {
        setApiDark(true);
        return;
      }
      setApiDark(false);
      setMe((await res.json()) as MeResponse);
    } catch {
      setApiDark(true);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    void loadMe();
  }, [ready, isAuthenticated, loadMe]);

  if (!ready) return null;
  if (!isAuthenticated) {
    return (
      <section
        className="border border-line rounded-sm p-4 space-y-2 bg-sand/20"
        data-testid="partner-directory-self-serve-signin"
      >
        <p className="text-sm text-muted">{t('signInLead')}</p>
        <Button type="button" onClick={() => void signIn()}>
          {t('signIn')}
        </Button>
      </section>
    );
  }
  if (!isPartner) return null;

  const submitApply = async () => {
    setBusy('apply');
    setErrorKey(null);
    try {
      const res = await createAuthedFetch(getAccessToken)(apiUrl('/partners/directory/apply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.status === 409) {
        setErrorKey('applyFailed');
        return;
      }
      if (!res.ok) {
        setErrorKey('applyFailed');
        return;
      }
      setForm(EMPTY_FORM);
      await loadMe();
    } catch {
      setErrorKey('applyFailed');
    } finally {
      setBusy(null);
    }
  };

  const startCheckout = async () => {
    setBusy('checkout');
    setErrorKey(null);
    try {
      const res = await createAuthedFetch(getAccessToken)(apiUrl('/partners/directory/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.status === 409) {
        setErrorKey('alreadyPaid');
        return;
      }
      if (res.status === 400) {
        setErrorKey('checkoutFailed');
        return;
      }
      if (!res.ok) {
        setErrorKey('checkoutFailed');
        return;
      }
      const body = (await res.json()) as { url?: string };
      if (!body.url) {
        setErrorKey('checkoutFailed');
        return;
      }
      window.location.href = body.url;
    } catch {
      setErrorKey('checkoutFailed');
    } finally {
      setBusy(null);
    }
  };

  const entry = me?.entry;

  return (
    <section
      className="border border-line rounded-sm p-4 space-y-3 bg-sand/20"
      data-testid="partner-directory-self-serve"
    >
      <h2 className="font-medium text-ink text-sm">{t('title')}</h2>
      <p className="text-xs text-muted">{t('portalNote')}</p>

      {apiDark ? (
        <p className="text-sm text-muted" data-testid="partner-directory-self-serve-dark">
          {t('unavailable')}
        </p>
      ) : null}

      {entry?.paidPlacement ? (
        <p className="text-sm text-ink" data-testid="partner-directory-self-serve-paid">
          {t('paidActive', { name: entry.name })}
        </p>
      ) : entry ? (
        <div className="space-y-2">
          <p className="text-sm">
            {t('listingPending', { name: entry.name, province: entry.province })}
          </p>
          {me?.checkoutAvailable ? (
            <Button
              type="button"
              disabled={busy === 'checkout'}
              onClick={() => void startCheckout()}
              data-testid="partner-directory-checkout-cta"
            >
              {busy === 'checkout' ? t('checkoutBusy') : t('checkoutCta')}
            </Button>
          ) : (
            <p className="text-sm text-muted" data-testid="partner-directory-not-purchasable">
              {t('notPurchasable')}
            </p>
          )}
        </div>
      ) : !apiDark ? (
        <form
          className="space-y-3 max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            void submitApply();
          }}
        >
          <label className="block text-sm space-y-1">
            <span>{t('fields.category')}</span>
            <select
              className="w-full border border-line rounded-sm px-2 py-1"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {PARTNER_DIRECTORY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {tCat(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm space-y-1">
            <span>{t('fields.name')}</span>
            <input
              className="w-full border border-line rounded-sm px-2 py-1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm space-y-1">
            <span>{t('fields.province')}</span>
            <input
              className="w-full border border-line rounded-sm px-2 py-1"
              value={form.province}
              onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm space-y-1">
            <span>{t('fields.credentials')}</span>
            <input
              className="w-full border border-line rounded-sm px-2 py-1"
              value={form.credentials}
              onChange={(e) => setForm((f) => ({ ...f, credentials: e.target.value }))}
            />
          </label>
          <label className="block text-sm space-y-1">
            <span>{t('fields.contact')}</span>
            <input
              className="w-full border border-line rounded-sm px-2 py-1"
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              required
            />
          </label>
          <Button type="submit" disabled={busy === 'apply'}>
            {busy === 'apply' ? t('applyBusy') : t('applyCta')}
          </Button>
        </form>
      ) : null}

      {errorKey ? (
        <p className="text-sm text-red-700" role="alert">
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}
    </section>
  );
}
