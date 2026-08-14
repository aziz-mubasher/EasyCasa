'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BoostDurationDays } from '@easycasa/shared';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { Button } from '@/components/ui/Button';
import { isBoostDuration, resolveBoostCtaState, type SellerListingBoostWire } from '@/lib/seller-monetisation';

type Props = {
  listingId: string;
  listingStatus: string;
  boostEnabled: boolean;
  boost: SellerListingBoostWire | null;
  compact?: boolean;
};

/** PP-5 — boost purchase CTA or active "In evidenza" state on seller listing cards. */
export function SellerBoostActions({
  listingId,
  listingStatus,
  boostEnabled,
  boost,
  compact = false,
}: Props) {
  const t = useTranslations('sellerMonetisation.boost');
  const tLabel = useTranslations('listingBoost');
  const { getAccessToken } = useAuth();
  const [busyDays, setBusyDays] = useState<BoostDurationDays | null>(null);
  const [errorKey, setErrorKey] = useState<'checkoutFailed' | 'activeLockout' | null>(null);

  const state = resolveBoostCtaState({ listingStatus, boostEnabled, boost });
  if (state === 'hidden') return null;

  const startBoost = async (days: BoostDurationDays) => {
    if (!isBoostDuration(days)) return;
    setBusyDays(days);
    setErrorKey(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setErrorKey('checkoutFailed');
        return;
      }
      const res = await createAuthedFetch(getAccessToken)(apiUrl('/featured/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, days }),
      });
      if (res.status === 409) {
        setErrorKey('activeLockout');
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
      setBusyDays(null);
    }
  };

  if (state === 'active' && boost?.remainingDays != null) {
    return (
      <p className={compact ? 'text-xs text-muted' : 'text-sm text-muted'} data-testid="boost-active">
        <span className="font-medium text-ink">{tLabel('inEvidenza')}</span>
        {' · '}
        {t('activeRemaining', { days: boost.remainingDays })}
      </p>
    );
  }

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'} data-testid="boost-buy">
      <p className={compact ? 'text-xs text-muted' : 'text-sm text-muted'}>{t('buyLead')}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className={compact ? 'px-3 py-1.5 text-xs' : undefined}
          disabled={busyDays !== null}
          onClick={() => void startBoost(7)}
        >
          {busyDays === 7 ? t('redirecting') : t('buy7d')}
        </Button>
        <Button
          variant="outline"
          className={compact ? 'px-3 py-1.5 text-xs' : undefined}
          disabled={busyDays !== null}
          onClick={() => void startBoost(30)}
        >
          {busyDays === 30 ? t('redirecting') : t('buy30d')}
        </Button>
      </div>
      {errorKey ? <p className="text-xs text-terracotta">{t(errorKey)}</p> : null}
    </div>
  );
}
