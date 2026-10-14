'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { HomeIntroVideo } from '@/components/home/HomeIntroVideo';
import { MundidaDevCredit } from '@/components/MundidaDevCredit';
import {
  FOR_BUYERS_INTRO_CATALOG_PATH,
  type HomeIntroCatalog,
} from '@/lib/home-intro-video';
import { BuyerIntroFilm } from './BuyerIntroFilm';
import './for-buyers.css';

type Pillar = {
  idx: string;
  tag: 'live' | 'soon';
  title: string;
  body: string;
  fig: string;
  figNote: string;
  figEst?: boolean;
  href?: string;
};

type TrustItem = { title: string; body: string; tag?: 'live' | 'soon' };
type Step = { title: string; body: string };
type CompareRow = {
  label: string;
  private: string;
  agency: string;
};
type FaqItem = { q: string; a: string };

type Props = {
  introCatalog: HomeIntroCatalog;
};

export function ForBuyersPage({ introCatalog }: Props) {
  const t = useTranslations('forBuyers');
  const locale = useLocale();
  const [filmOpen, setFilmOpen] = useState(false);
  const pillars = t.raw('pillars') as Pillar[];
  const trust = t.raw('trust.items') as TrustItem[];
  const steps = t.raw('how.steps') as Step[];
  const compare = t.raw('compare.rows') as CompareRow[];
  const faq = t.raw('faq.items') as FaqItem[];

  return (
    <div className="fb">
      <header className="fb-hero">
        <div className="fb-wrap fb-hero-grid">
          <div className="fb-hero-copy">
            <p className="fb-kicker">{t('hero.kicker')}</p>
            <h1>
              {t('hero.title')}
              <br />
              <em>{t('hero.titleEm')}</em>
            </h1>
            <p className="fb-lead">{t('hero.lead')}</p>
            <div className="fb-actions">
              <Link className="fb-btn fb-btn--primary" href="/search">
                {t('hero.ctaPrimary')}
              </Link>
              <button type="button" className="fb-btn fb-btn--ghost" onClick={() => setFilmOpen(true)}>
                {t('hero.ctaSecondary')}
              </button>
              <Link className="fb-btn fb-btn--ghost" href="/pricing">
                {t('hero.ctaPricing')}
              </Link>
            </div>
          </div>
          <HomeIntroVideo
            locale={locale}
            title={t('hero.videoTitle')}
            langLabel={t('hero.videoLangLabel')}
            catalog={introCatalog}
            catalogPath={FOR_BUYERS_INTRO_CATALOG_PATH}
            langsLabelId="fb-video-langs-label"
          />
        </div>
      </header>

      <section id="services" className="fb-section">
        <div className="fb-wrap">
          <p className="fb-kicker fb-kicker--ink">{t('services.kicker')}</p>
          <h2>{t('services.title')}</h2>
          <p className="fb-sub">{t('services.sub')}</p>
          <div className="fb-pillars">
            {pillars.map((p) => (
              <article key={p.idx} className="fb-card">
                <span className="idx">{p.idx}</span>
                <span className={`fb-tag fb-tag--${p.tag}`}>
                  {p.tag === 'live' ? t('tags.live') : t('tags.soon')}
                </span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <p className={`fig${p.figEst || p.tag === 'soon' ? ' est' : ''}`}>
                  {p.href ? <Link href={p.href}>{p.fig}</Link> : p.fig}{' '}
                  <span>— {p.figNote}</span>
                </p>
              </article>
            ))}
          </div>
          <aside className="fb-model" aria-labelledby="fb-model-title">
            <p className="fb-kicker fb-kicker--ink">{t('model.kicker')}</p>
            <h3 id="fb-model-title">{t('model.title')}</h3>
            <p>{t('model.body')}</p>
            <Link className="fb-btn fb-btn--model" href="/pricing">
              {t('model.cta')}
            </Link>
          </aside>
        </div>
      </section>

      <section className="fb-section fb-trust">
        <div className="fb-wrap">
          <p className="fb-kicker fb-kicker--ink">{t('trust.kicker')}</p>
          <h2>{t('trust.title')}</h2>
          <p className="fb-sub">{t('trust.sub')}</p>
          <div className="fb-trust-grid">
            {trust.map((item) => (
              <div key={item.title} className="fb-trust-item">
                {item.tag ? (
                  <span className={`fb-tag fb-tag--${item.tag}`}>
                    {item.tag === 'live' ? t('tags.live') : t('tags.soon')}
                  </span>
                ) : null}
                <h4>{item.title}</h4>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="fb-section">
        <div className="fb-wrap">
          <p className="fb-kicker fb-kicker--ink">{t('how.kicker')}</p>
          <h2>{t('how.title')}</h2>
          <div className="fb-steps">
            {steps.map((s) => (
              <div key={s.title} className="fb-step">
                <h4>{s.title}</h4>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fb-section">
        <div className="fb-wrap">
          <p className="fb-kicker fb-kicker--ink">{t('compare.kicker')}</p>
          <h2>{t('compare.title')}</h2>
          <div className="fb-table-wrap">
            <table className="fb-table">
              <thead>
                <tr>
                  <th scope="col" />
                  <th scope="col">{t('compare.private')}</th>
                  <th scope="col">{t('compare.agency')}</th>
                </tr>
              </thead>
              <tbody>
                {compare.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.private}</td>
                    <td>{row.agency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="intro" className="fb-section fb-film-section">
        <div className="fb-wrap">
          <p className="fb-kicker fb-kicker--ink">{t('film.kicker')}</p>
          <h2>{t('film.title')}</h2>
          <BuyerIntroFilm fullscreenOpen={filmOpen} onFullscreenOpenChange={setFilmOpen} />
        </div>
      </section>

      <section className="fb-section" aria-labelledby="fb-faq-title">
        <div className="fb-wrap">
          <p className="fb-kicker fb-kicker--ink">{t('faq.kicker')}</p>
          <h2 id="fb-faq-title">{t('faq.title')}</h2>
          <div className="fb-faq">
            {faq.map((item) => (
              <details key={item.q} className="fb-faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <div className="fb-final">
        <div className="fb-wrap">
          <h2>
            {t('final.title')}
            <br />
            {t('final.titleLine2')}
          </h2>
          <p>{t('final.body')}</p>
          <Link className="fb-btn fb-btn--primary" href="/search">
            {t('final.cta')}
          </Link>
        </div>
      </div>

      <footer className="fb-foot">
        <div className="fb-wrap">
          <p>
            {t('foot.mundida')}
            <MundidaDevCredit inline leadingMiddot />
          </p>
          <p>{t('foot.omi')}</p>
          <p>
            <Link href="/privacy">{t('foot.privacy')}</Link> ·{' '}
            <Link href="/legal/terms">{t('foot.terms')}</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
