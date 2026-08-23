'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MundidaDevCredit } from '@/components/MundidaDevCredit';
import { PRODUCT_EVENTS, trackProduct } from '@/lib/product-analytics';
import './aste-guida.css';

type Check = { title: string; body: string };

export function AsteGuidaPage() {
  const t = useTranslations('asteGuida');
  const locale = useLocale();
  const checks = t.raw('checks') as Check[];

  useEffect(() => {
    trackProduct(PRODUCT_EVENTS.ASTE_GUIDE_OPENED, { locale, language: locale });
  }, [locale]);

  return (
    <article className="guida">
      <header className="guida-header">
        <div className="guida-wrap">
          <p className="guida-brand">EasyCasa</p>
          <p className="guida-kicker">{t('kicker')}</p>
          <h1>{t('title')}</h1>
          <p className="guida-intro">{t('intro')}</p>
          <p className="guida-print-hint">{t('printHint')}</p>
        </div>
      </header>

      <div className="guida-wrap guida-body">
        {checks.map((check, i) => (
          <section key={check.title} className="guida-check" aria-labelledby={`check-${i + 1}`}>
            <p className="guida-num" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </p>
            <h2 id={`check-${i + 1}`}>{check.title}</h2>
            <p>{check.body}</p>
          </section>
        ))}

        <section className="guida-close" aria-labelledby="guida-close">
          <h2 id="guida-close">{t('closeTitle')}</h2>
          <p>{t('close')}</p>
        </section>

        <footer className="guida-foot">
          <p>{t('disclaimer')}</p>
          <p className="guida-counsel">{t('counselMark')}</p>
          <MundidaDevCredit />
        </footer>
      </div>
    </article>
  );
}
