'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AsteApiError,
  checkoutCreditPack,
  unlockReport,
  type AsteReport,
} from '@/lib/aste-analysis-api';
import { PRODUCT_EVENTS, trackProduct } from '@/lib/product-analytics';

type Props = {
  analysisId: string;
  entitlement: NonNullable<AsteReport['entitlement']>;
  getAccessToken: () => Promise<string | null>;
  onUnlocked: () => Promise<void>;
};

const PACKS = [1, 3, 10] as const;

export function AsteReportUnlockPanel({
  analysisId,
  entitlement,
  getAccessToken,
  onUnlocked,
}: Props) {
  const t = useTranslations('asteReport.unlock');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUnlockWithCredit() {
    setBusy(true);
    setError(null);
    try {
      await unlockReport(getAccessToken, analysisId);
      trackProduct(PRODUCT_EVENTS.ASTE_REPORT_UNLOCKED, { analysisId });
      await onUnlocked();
    } catch (err) {
      if (err instanceof AsteApiError && err.code === 'ASTE_INSUFFICIENT_CREDITS') {
        setError(t('errors.insufficient'));
      } else {
        setError(t('errors.unlock'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onBuyPack(pack: 1 | 3 | 10) {
    setBusy(true);
    setError(null);
    try {
      const { url } = await checkoutCreditPack(getAccessToken, pack);
      trackProduct(PRODUCT_EVENTS.ASTE_CREDITS_PURCHASED, { pack });
      window.location.href = url;
    } catch {
      setError(t('errors.checkout'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ar-section ar-unlock no-print" aria-labelledby="ar-unlock-title">
      <h2 id="ar-unlock-title">{t('title')}</h2>
      <p>{t('lead')}</p>
      <p className="ar-unlock-balance">
        {t('balance', { count: entitlement.creditBalance })}
      </p>
      {entitlement.creditBalance > 0 ? (
        <button
          type="button"
          className="ar-btn ar-btn--primary"
          disabled={busy}
          onClick={() => void onUnlockWithCredit()}
        >
          {t('useCredit')}
        </button>
      ) : null}
      <div className="ar-unlock-packs">
        <p className="ar-unlock-packs-label">{t('packsLabel')}</p>
        <ul className="ar-unlock-pack-list">
          {PACKS.map((pack) => (
            <li key={pack}>
              <button
                type="button"
                className="ar-btn"
                disabled={busy}
                onClick={() => void onBuyPack(pack)}
              >
                {t(`packs.${pack}`)}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="ar-disclaimer ar-unlock-legal" role="note">
        <strong>{t('counselMark')}</strong> — {t('legal')}
      </p>
      {error ? (
        <p className="ar-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
