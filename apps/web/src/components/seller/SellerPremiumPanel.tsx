'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/routing';
import { openPortal, startCheckout } from '@/lib/billing';
import type { SellerEntitlementsResponse } from '@/lib/seller-monetisation';

type Props = {
  loading: boolean;
  flagOff: boolean;
  data: SellerEntitlementsResponse | null;
  onRefresh: () => Promise<void>;
};

/** PP-5 — premium tier display, entitlements, subscribe + portal actions. */
export function SellerPremiumPanel({ loading, flagOff, data, onRefresh }: Props) {
  const t = useTranslations('sellerMonetisation.premium');
  const locale = useLocale();
  const { isAuthenticated, signIn, getAccessToken } = useAuth();
  const [busy, setBusy] = useState<'checkout' | 'portal' | null>(null);
  const [errorKey, setErrorKey] = useState<'checkoutFailed' | 'portalFailed' | null>(null);

  if (flagOff) return null;

  if (!isAuthenticated) {
    return (
      <section className="rounded-xl2 border border-line bg-paper p-6" data-testid="premium-sign-in">
        <h2 className="font-display text-xl">{t('title')}</h2>
        <p className="mt-2 text-sm text-muted">{t('signInLead')}</p>
        <Button className="mt-4" onClick={() => void signIn(`/${locale}/seller/listings`)}>
          {t('signIn')}
        </Button>
      </section>
    );
  }

  if (loading && !data) {
    return (
      <section className="rounded-xl2 border border-line bg-paper p-6" aria-busy="true">
        <p className="text-sm text-muted">{t('loading')}</p>
      </section>
    );
  }

  if (!data) return null;

  const tierKey = data.tier === 'premium' ? 'tierPremium' : 'tierFree';
  const e = data.entitlements;
  const q = data.quota;

  const runCheckout = async () => {
    setBusy('checkout');
    setErrorKey(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setErrorKey('checkoutFailed');
        return;
      }
      const url = await startCheckout(token, 'seller_premium');
      window.location.href = url;
    } catch {
      setErrorKey('checkoutFailed');
    } finally {
      setBusy(null);
    }
  };

  const runPortal = async () => {
    setBusy('portal');
    setErrorKey(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setErrorKey('portalFailed');
        return;
      }
      const url = await openPortal(token);
      window.location.href = url;
    } catch {
      setErrorKey('portalFailed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-xl2 border border-line bg-paper p-6" data-testid="seller-premium-panel">
      <h2 className="font-display text-xl">{t('title')}</h2>
      <p className="mt-1 text-sm font-medium">{t(tierKey)}</p>
      <ul className="mt-4 space-y-2 text-sm text-muted">
        <li>{t('entitlements.activeListings', { limit: q.maxActiveListings })}</li>
        <li>{t('entitlements.uploadsPerDay', { limit: q.maxUploadsPerDay })}</li>
        <li>{t('entitlements.analyticsWindow', { days: e.analyticsWindowDays })}</li>
        {e.priorityModeration ? <li>{t('entitlements.priorityModeration')}</li> : null}
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        {data.tier === 'premium' ? (
          <Button disabled={busy !== null} onClick={() => void runPortal()}>
            {busy === 'portal' ? t('redirecting') : t('manage')}
          </Button>
        ) : (
          <Button disabled={busy !== null} onClick={() => void runCheckout()}>
            {busy === 'checkout' ? t('redirecting') : t('subscribe')}
          </Button>
        )}
        <Button variant="ghost" disabled={busy !== null} onClick={() => void onRefresh()}>
          {t('refresh')}
        </Button>
      </div>
      {errorKey ? <p className="mt-3 text-sm text-terracotta">{t(errorKey)}</p> : null}
      <p className="mt-4 text-xs text-muted">{t('portalNote')}</p>
    </section>
  );
}

/** Compact upsell shown when wizard hits quota 429. */
export function SellerQuotaUpsell({
  premiumEnabled,
  entitlements,
  onSubscribe,
}: {
  premiumEnabled: boolean;
  entitlements: SellerEntitlementsResponse | null;
  onSubscribe?: () => void;
}) {
  const t = useTranslations('sellerMonetisation.premium');
  const tQuota = useTranslations('errors.quota');
  const { getAccessToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<'checkoutFailed' | null>(null);

  if (!premiumEnabled || entitlements?.tier === 'premium') {
    return (
      <div className="rounded-xl2 border border-line bg-paper p-6 text-center" data-testid="quota-dead-end">
        <p className="text-sm text-terracotta">{tQuota('activeListings')}</p>
      </div>
    );
  }

  const limits = entitlements?.quota;

  const subscribe = async () => {
    setBusy(true);
    setErrorKey(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setErrorKey('checkoutFailed');
        return;
      }
      onSubscribe?.();
      const url = await startCheckout(token, 'seller_premium');
      window.location.href = url;
    } catch {
      setErrorKey('checkoutFailed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl2 border border-line bg-paper p-6" data-testid="quota-upsell">
      <h2 className="font-display text-xl">{t('upsellTitle')}</h2>
      <p className="mt-2 text-sm text-muted">{t('upsellBody')}</p>
      {limits ? (
        <ul className="mt-4 space-y-1 text-sm text-muted">
          <li>{t('upsellLimitsCurrent', { limit: limits.maxActiveListings })}</li>
          <li>{t('upsellLimitsPremium', { limit: entitlements?.entitlements.maxActiveListings ?? '—' })}</li>
        </ul>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <Button disabled={busy} onClick={() => void subscribe()}>
          {busy ? t('redirecting') : t('upsellAction')}
        </Button>
        <Link href="/seller/listings" className="text-sm underline self-center">
          {t('upsellManageLink')}
        </Link>
      </div>
      {errorKey ? <p className="mt-3 text-sm text-terracotta text-center">{t(errorKey)}</p> : null}
    </div>
  );
}
