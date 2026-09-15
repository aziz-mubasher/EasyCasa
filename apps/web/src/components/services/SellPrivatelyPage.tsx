'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  getSellPrivatelyLedger,
  getSellPrivatelySteps,
  showBuyerPreapprovalComing,
  showBuyerPreapprovalLive,
  showEnergyRequiredLive,
  showMediazioneBoundary,
  showMediazioneFallback,
  showSavingsFallback,
  showSavingsFigures,
  type StepChip,
} from '@/lib/sell-privately';
import { SellPrivatelySavingsSlider } from './SellPrivatelySavingsSlider';
import { SellerIntroFilm } from './SellerIntroFilm';
import './sell-privately.css';

type FaqItem = { q: string; a: string };
type SplitItem = { text: string };
type NeverItem = { title: string; body: string };
type CostItem = { title: string; body: string; price: string; free?: boolean };
type MoneyItem = { figure: string; title: string; body: string };
type PairItem = { title: string; body: string };
type ReadyStep = { title: string; body: string };

const APE_SCALE = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

function StatusChip({ status, labels }: { status: StepChip; labels: Record<StepChip, string> }) {
  return (
    <span className={`sp-chip sp-chip--${status}`} role="status" aria-label={labels[status]}>
      {labels[status]}
    </span>
  );
}

export function SellPrivatelyPage() {
  const t = useTranslations('sellPrivately');
  const [filmOpen, setFilmOpen] = useState(false);
  const ledger = getSellPrivatelyLedger();
  const steps = getSellPrivatelySteps(ledger);
  const faq = t.raw('faq.items') as FaqItem[];
  const youDo = t.raw('split.youItems') as SplitItem[];
  const weDo = t.raw('split.weItems') as SplitItem[];
  const neverItems = t.raw('never.items') as NeverItem[];
  const money = t.raw('money.items') as MoneyItem[];
  const costs = t.raw('costs.items') as CostItem[];
  const apePairs = t.raw('ape.pairs') as PairItem[];
  const readySteps = t.raw('ready.steps') as ReadyStep[];
  const figuresLive = showSavingsFigures(ledger);
  const figuresFallback = showSavingsFallback(ledger);
  const mediazioneLive = showMediazioneBoundary(ledger);
  const mediazioneFallback = showMediazioneFallback(ledger);
  const energyLive = showEnergyRequiredLive(ledger);
  const readyComing = showBuyerPreapprovalComing(ledger);
  const readyLive = showBuyerPreapprovalLive(ledger);
  const chipLabels: Record<StepChip, string> = {
    live: t('tags.live'),
    coming: t('tags.coming'),
    you: t('tags.you'),
  };

  return (
    <div className="sp">
      <header className="sp-hero">
        <div className="sp-wrap">
          <p className="sp-kicker sp-kicker--hero">{t('hero.kicker')}</p>
          <h1 className="sp-display">{t('hero.title')}</h1>
          <p className="sp-lead">{t('hero.lead')}</p>
          <div className="sp-actions">
            <Link className="sp-btn sp-btn--primary" href="/add">
              {t('hero.ctaPrimary')}
            </Link>
            <button type="button" className="sp-btn sp-btn--ghost" onClick={() => setFilmOpen(true)}>
              {t('hero.ctaFilm')}
            </button>
            <small className="sp-hero-free">{t('hero.freeAlways')}</small>
          </div>
        </div>
      </header>

      <dl className="sp-money">
        {money.map((item) => (
          <div key={item.figure}>
            <dt className="sp-datum">{item.figure}</dt>
            <dd>
              <strong>{item.title}</strong> {item.body}
            </dd>
          </div>
        ))}
      </dl>

      <div className="sp-split">
        <div>
          <h2 className="sp-display">{t('split.youTitle')}</h2>
          <ul>
            {youDo.map((item) => (
              <li key={item.text}>{item.text}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="sp-display">{t('split.weTitle')}</h2>
          <ul>
            {weDo.map((item) => (
              <li key={item.text}>{item.text}</li>
            ))}
          </ul>
        </div>
      </div>

      <section id="intro" className="sp-section sp-film-section" aria-labelledby="sp-film-title">
        <div className="sp-wrap">
          <p className="sp-kicker">{t('film.kicker')}</p>
          <h2 id="sp-film-title" className="sp-display">
            {t('film.title')}
          </h2>
          <SellerIntroFilm fullscreenOpen={filmOpen} onFullscreenOpenChange={setFilmOpen} />
        </div>
      </section>

      {figuresLive || figuresFallback ? (
        <section className="sp-section sp-savings" aria-labelledby="sp-savings-title">
          <div className="sp-wrap">
            <p className="sp-kicker">{t('savings.kicker')}</p>
            <h2 id="sp-savings-title" className="sp-display">
              {figuresLive ? t('savings.title') : t('savings.neutralTitle')}
            </h2>
            {figuresLive ? (
              <>
                <p className="sp-body">
                  {t('savings.bodyBefore')}{' '}
                  <span className="sp-datum sp-est">{t('savings.figure')}</span>
                  {t('savings.bodyAfter')}
                </p>
                <SellPrivatelySavingsSlider />
                <p className="sp-fn">
                  <sup>*</sup> {t('savings.footnote')}
                </p>
              </>
            ) : (
              <p className="sp-body">{t('savings.neutralBody')}</p>
            )}
          </div>
        </section>
      ) : null}

      <section id="how" className="sp-section" aria-labelledby="sp-how-title">
        <div className="sp-wrap">
          <div className="sp-group-head">
            <h2 id="sp-how-title" className="sp-display">
              {t('how.title')}
            </h2>
            <p>{t('how.sub')}</p>
          </div>
          <ol className="sp-steps">
            {steps.map((step, index) => (
              <li key={step.id} className="sp-step">
                <span className="sp-step-num" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>{t(`how.steps.${step.id}.title`)}</h3>
                <StatusChip status={step.status} labels={chipLabels} />
                <p>{t(`how.steps.${step.id}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sp-never" aria-labelledby="sp-never-title">
        <p className="sp-kicker">{t('never.kicker')}</p>
        <h2 id="sp-never-title" className="sp-display">
          {t('never.title')}
        </h2>
        <ul>
          {neverItems.map((item) => (
            <li key={item.title}>
              {item.title}
              <span>{item.body}</span>
            </li>
          ))}
        </ul>
      </section>

      {energyLive ? (
        <section className="sp-ape" aria-labelledby="sp-ape-title">
          <p className="sp-kicker">{t('ape.kicker')}</p>
          <h2 id="sp-ape-title" className="sp-display">
            {t('ape.title')}
          </h2>
          <p>{t('ape.body')}</p>
          <div className="sp-ape-scale" aria-hidden>
            {APE_SCALE.map((letter) => (
              <span key={letter} data-class={letter[0]}>
                {letter}
              </span>
            ))}
          </div>
          <p className="sp-ape-cite">{t('ape.cite')}</p>
          <div className="sp-ape-pair">
            {apePairs.map((item) => (
              <div key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {readyLive || readyComing ? (
        <section className="sp-ready" aria-labelledby="sp-ready-title">
          <p className="sp-kicker">{readyLive ? t('ready.kicker') : t('ready.kickerComing')}</p>
          <h2 id="sp-ready-title" className="sp-display">
            {t('ready.title')}
          </h2>
          <p>{readyLive ? t('ready.body') : t('ready.bodyComing')}</p>
          {readyLive ? (
            <>
              <ol>
                {readySteps.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </li>
                ))}
              </ol>
              <p className="sp-ready-foot">{t('ready.foot')}</p>
            </>
          ) : (
            <p className="sp-ready-foot">{t('ready.footComing')}</p>
          )}
        </section>
      ) : null}

      {mediazioneLive ? (
        <section className="sp-section sp-not" aria-labelledby="sp-not-title">
          <div className="sp-wrap">
            <p className="sp-kicker">{t('not.kicker')}</p>
            <h2 id="sp-not-title" className="sp-display">
              {t('not.title')}
            </h2>
            <p className="sp-body">{t('not.body')}</p>
          </div>
        </section>
      ) : mediazioneFallback ? (
        <section className="sp-section sp-not sp-not--fallback" aria-labelledby="sp-not-title">
          <div className="sp-wrap">
            <p className="sp-kicker">{t('not.kicker')}</p>
            <h2 id="sp-not-title" className="sp-display">
              {t('not.fallbackTitle')}
            </h2>
            <p className="sp-body">{t('not.fallbackBody')}</p>
          </div>
        </section>
      ) : null}

      <section className="sp-section" aria-labelledby="sp-costs-title">
        <div className="sp-wrap">
          <div className="sp-group-head">
            <h2 id="sp-costs-title" className="sp-display">
              {t('costs.title')}
            </h2>
            <p>{t('costs.sub')}</p>
          </div>
          <div className="sp-costs">
            {costs.map((item) => (
              <article key={item.title} className="sp-cost">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <span className={`sp-cost-price${item.free ? ' is-free' : ''}`}>{item.price}</span>
              </article>
            ))}
          </div>
          <p className="sp-costs-note">
            {t('costs.noteBefore')}{' '}
            <Link href="/pricing">{t('costs.noteLink')}</Link>
            {t('costs.noteAfter')}
          </p>
        </div>
      </section>

      <section className="sp-agency" aria-labelledby="sp-agency-title">
        <h2 id="sp-agency-title" className="sp-display">
          {t('agency.title')}
        </h2>
        <p>{t('agency.body')}</p>
        <p>
          {t('agency.dirBefore')}{' '}
          <Link href="/agenzie">{t('agency.dirLink')}</Link>
          {t('agency.dirAfter')}
        </p>
      </section>

      <section className="sp-section" aria-labelledby="sp-faq-title">
        <div className="sp-wrap">
          <div className="sp-group-head">
            <h2 id="sp-faq-title" className="sp-display">
              {t('faq.title')}
            </h2>
          </div>
          <dl className="sp-faq-dl">
            {faq.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
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
          <p>
            {t('foot.entityBefore')}{' '}
            <span className="sp-hole">{t('foot.entityHole')}</span>
            {t('foot.entityAfter')}
          </p>
          <p>
            <strong>{t('foot.notEnrolled')}</strong>{' '}
            {t('foot.mediationBefore')}{' '}
            <Link href="/legal/mediation">{t('foot.mediation')}</Link>
            {t('foot.mediationAfter')}
          </p>
          <p>
            {t('foot.privacyBefore')}{' '}
            <Link href="/legal/privacy">{t('foot.privacyLink')}</Link>
            {t('foot.privacyAfter')}{' '}
            <Link href="/privacy">{t('foot.myData')}</Link>.
          </p>
        </div>
      </footer>
    </div>
  );
}
