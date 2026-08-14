'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { useSellerEntitlements } from '@/hooks/useSellerEntitlements';
import { useSellerListings } from '@/hooks/useSellerListings';

import { SellerListingCard } from './SellerListingCard';
import { SellerPremiumPanel } from './SellerPremiumPanel';

/** PP-5 — seller listings dashboard with boost cards + premium entitlements. */
export function SellerListingsPanel() {
  const t = useTranslations('sellerMonetisation.myListings');
  const locale = useLocale();
  const { ready, isAuthenticated, signIn } = useAuth();
  const listings = useSellerListings(ready && isAuthenticated);
  const entitlements = useSellerEntitlements(ready && isAuthenticated);

  if (!ready) return null;

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl">{t('signInTitle')}</h1>
        <Button className="mt-6" onClick={() => void signIn(`/${locale}/seller/listings`)}>
          {t('signIn')}
        </Button>
      </div>
    );
  }

  if (listings.unavailable) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-muted">{t('unavailable')}</p>
      </div>
    );
  }

  const boostEnabled = listings.data?.flags.listingBoostEnabled ?? false;
  const items = listings.data?.items ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-10">
      <header>
        <h1 className="font-display text-3xl">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted">{t('lead')}</p>
      </header>

      <SellerPremiumPanel
        loading={entitlements.loading}
        flagOff={entitlements.flagOff}
        data={entitlements.data}
        onRefresh={entitlements.refresh}
      />

      {listings.loading && items.length === 0 ? (
        <p className="text-sm text-muted">{t('loading')}</p>
      ) : null}

      {!listings.loading && items.length === 0 ? (
        <p className="text-sm text-muted">{t('empty')}</p>
      ) : null}

      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id}>
            <SellerListingCard item={item} boostEnabled={boostEnabled} />
          </li>
        ))}
      </ul>
    </div>
  );
}
