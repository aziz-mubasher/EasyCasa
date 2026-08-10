'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  getSellPrivatelyLedger,
  type PromiseEntry,
  visiblePromiseEntries,
} from '@/lib/sell-privately';
import { SellPrivatelySavingsSlider } from './SellPrivatelySavingsSlider';
import './sell-privately.css';

type FaqItem = { q: string; a: string };

function StatusChip({ status, liveLabel, comingLabel }: {
  status: PromiseEntry['status'];
  liveLabel: string;
  comingLabel: string;
}) {
  if (status === 'live') {
    return <span className="sp-chip sp-chip--live">{liveLabel}</span>;
  }
  return <span className="sp-chip sp-chip--coming">{comingLabel}</span>;
}

export function SellPrivatelyPage() {
  const t = useTranslations('sellPrivately');
  const ledger = getSellPrivatelyLedger();
  const steps = visiblePromiseEntries(ledger.steps);
  const benefits = visiblePromiseEntries(ledger.benefits);
  const faq = t.raw('faq.items') as FaqItem[];

  return (
    <div className="sp">
      <header className="sp-hero">
        <div className="sp-wrap">
          <p className="sp-brand">EasyCasa</p>
          <h1 className="sp-display">{t('hero.title')}</h1>
          <p className="sp-lead">{t('hero.lead')}</p>
          <div className="sp-actions">
            <Link className="sp-btn sp-btn--primary" href="/add">
              {t('hero.ctaPrimary')}
            </Link>
            <a className="sp-btn sp-btn--ghost" href="#how">
              {t('hero.ctaSecondary')}
            </a>
          </div>
        </div>
      </header>

      <section className="sp-section sp-savings" aria-labelledby="sp-savings-title">
        <div className="sp-wrap">
          <p className="sp-kicker">{t('savings.kicker')}</p>
          <h2 id="sp-savings-title" className="sp-display">
            {t('savings.title')}
          </h2>
          <p className="sp-body">
            {t('savings.bodyBefore')}{' '}
            <span className="sp-datum sp-est">{t('savings.figure')}</span>
            {t('savings.bodyAfter')}
          </p>
          <SellPrivatelySavingsSlider />
          <p className="sp-fn">
            <sup>*</sup> {t('savings.footnote')}
          </p>
          <p className="sp-counsel">{t('counselTemplate')}</p>
        </div>
      </section>

      <section id="how" className="sp-section" aria-labelledby="sp-how-title">
        <div className="sp-wrap">
          <p className="sp-kicker">{t('how.kicker')}</p>
          <h2 id="sp-how-title" className="sp-display">
            {t('how.title')}
          </h2>
          <ol className="sp-steps">
            {steps.map((step, index) => (
              <li key={step.id} className="sp-step">
                <div className="sp-step-head">
                  <span className="sp-step-num" aria-hidden>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <StatusChip
                    status={step.status}
                    liveLabel={t('tags.live')}
                    comingLabel={t('tags.coming')}
                  />
                </div>
                <h3>{t(`how.steps.${step.id}.title`)}</h3>
                <p>{t(`how.steps.${step.id}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sp-section sp-benefits" aria-labelledby="sp-benefits-title">
        <div className="sp-wrap">
          <p className="sp-kicker">{t('benefits.kicker')}</p>
          <h2 id="sp-benefits-title" className="sp-display">
            {t('benefits.title')}
          </h2>
          <p className="sp-sub">{t('benefits.sub')}</p>
          <ul className="sp-grid">
            {benefits.map((b) => (
              <li key={b.id} className="sp-tile">
                <div className="sp-tile-head">
                  <span className="sp-tile-id">{b.id}</span>
                  <StatusChip
                    status={b.status}
                    liveLabel={t('tags.live')}
                    comingLabel={t('tags.coming')}
                  />
                </div>
                <h3>{t(`benefits.items.${b.id}.title`)}</h3>
                <p>{t(`benefits.items.${b.id}.body`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sp-section sp-not" aria-labelledby="sp-not-title">
        <div className="sp-wrap">
          <p className="sp-kicker">{t('not.kicker')}</p>
          <h2 id="sp-not-title" className="sp-display">
            {t('not.title')}
          </h2>
          <p className="sp-body">{t('not.body')}</p>
          <p className="sp-counsel">{t('counselTemplate')}</p>
        </div>
      </section>

      <section className="sp-section" aria-labelledby="sp-faq-title">
        <div className="sp-wrap">
          <p className="sp-kicker">{t('faq.kicker')}</p>
          <h2 id="sp-faq-title" className="sp-display">
            {t('faq.title')}
          </h2>
          <div className="sp-faq">
            {faq.map((item) => (
              <details key={item.q} className="sp-faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="sp-final">
        <div className="sp-wrap">
          <h2 className="sp-display">{t('final.title')}</h2>
          <p>{t('final.body')}</p>
          <Link className="sp-btn sp-btn--primary" href="/add">
            {t('final.cta')}
          </Link>
        </div>
      </section>

      <footer className="sp-foot">
        <div className="sp-wrap">
          <p>{t('foot.legal')}</p>
          <p>
            {t('foot.privacyBefore')}{' '}
            <Link href="/legal/privacy">{t('foot.privacyLink')}</Link>
            {t('foot.privacyAfter', { version: t('foot.privacyVersion') })}
          </p>
          <p>
            {t('foot.copyright')} · <Link href="/privacy">{t('foot.myData')}</Link> ·{' '}
            <Link href="/legal/mediation">{t('foot.mediation')}</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
