'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
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

type TrustItem = { title: string; body: string };
type Step = { title: string; body: string };
type CompareRow = {
  label: string;
  agency: string;
  easycasa: string;
  agencyKind?: 'money-cost' | 'no';
  easycasaKind?: 'money-zero' | 'yes';
};

export function ForBuyersPage() {
  const t = useTranslations('forBuyers');
  const pillars = t.raw('pillars') as Pillar[];
  const trust = t.raw('trust.items') as TrustItem[];
  const steps = t.raw('how.steps') as Step[];
  const compare = t.raw('compare.rows') as CompareRow[];

  return (
    <div className="fb">
      <header className="fb-hero">
        <div className="fb-wrap">
          <p className="fb-kicker">{t('hero.kicker')}</p>
          <h1>
            {t('hero.title')}
            <br />
            <em>{t('hero.titleEm')}</em>
          </h1>
          <p className="fb-lead">{t('hero.lead')}</p>
          <div className="fb-figure">
            <span className="num est">{t('hero.figure')}</span>
            <span className="lbl">
              {t('hero.figureLabel')}
              <sup>1</sup>
            </span>
          </div>
          <div className="fb-actions">
            <Link className="fb-btn fb-btn--primary" href="/search">
              {t('hero.ctaPrimary')}
            </Link>
            <a className="fb-btn fb-btn--ghost" href="#how">
              {t('hero.ctaSecondary')}
            </a>
          </div>
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
          <div className="fb-privacy">
            <div className="icon" aria-hidden>
              ⬢
            </div>
            <p>
              <strong>{t('how.privacyStrong')} </strong>
              {t('how.privacyBody')}{' '}
              <Link href="/privacy">{t('how.privacyLink')}</Link>.
            </p>
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
                  <th scope="col">{t('compare.agency')}</th>
                  <th scope="col">{t('compare.easycasa')}</th>
                </tr>
              </thead>
              <tbody>
                {compare.map((row) => (
                  <tr key={row.label}>
                    <td>
                      {row.label}
                      {row.agencyKind === 'money-cost' ? <sup>1</sup> : null}
                    </td>
                    <td
                      className={
                        row.agencyKind === 'money-cost'
                          ? 'money cost'
                          : undefined
                      }
                    >
                      {row.agencyKind === 'no' ? (
                        <span className="no">{row.agency}</span>
                      ) : (
                        row.agency
                      )}
                    </td>
                    <td
                      className={
                        row.easycasaKind === 'money-zero' ? 'money zero' : undefined
                      }
                    >
                      {row.easycasaKind === 'yes' ? (
                        <span className="yes">{row.easycasa}</span>
                      ) : (
                        row.easycasa
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fb-fn">
            <sup>1</sup> {t('compare.footnote')}
          </p>
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
          <p>{t('foot.mundida')}</p>
          <p>{t('foot.omi')}</p>
          <p>
            {t('foot.copyright')} · <Link href="/privacy">{t('foot.privacy')}</Link> ·{' '}
            <Link href="/legal/terms">{t('foot.terms')}</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
