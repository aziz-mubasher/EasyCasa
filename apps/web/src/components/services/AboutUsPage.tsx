'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import './about-us.css';

type Pillar = { num: string; title: string; body: string };
type ExploreLink = { label: string; href: string };
type ExploreCol = { title: string; links: ExploreLink[] };

export function AboutUsPage() {
  const t = useTranslations('aboutUs');
  const pillars = t.raw('pillars') as Pillar[];
  const explore = t.raw('explore.cols') as ExploreCol[];

  return (
    <div className="au">
      <div className="au-wrap">
        <header className="au-hero">
          <p className="au-kicker">{t('hero.kicker')}</p>
          <h1>{t('hero.title')}</h1>
          <p className="au-lede">{t('hero.lede')}</p>
        </header>

        <section className="au-section" aria-labelledby="au-how-title">
          <h2 id="au-how-title" className="au-section-title">
            {t('how.title')}
          </h2>
          <div className="au-pillars">
            {pillars.map((p) => (
              <article key={p.num} className="au-pillar">
                <span className="num">{p.num}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="au-section" aria-labelledby="au-explore-title">
          <h2 id="au-explore-title" className="au-section-title">
            {t('explore.title')}
          </h2>
          <div className="au-links">
            {explore.map((col) => (
              <div key={col.title} className="au-link-col">
                <h3>{col.title}</h3>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="au-section">
          <div className="au-contact">
            <div>
              <h2>{t('contact.title')}</h2>
              <p>{t('contact.body')}</p>
            </div>
            <div className="au-contact-methods">
              <a href="mailto:info@easycasaita.com">
                <span className="label">{t('contact.emailLabel')}</span>
                <span className="value">info@easycasaita.com</span>
              </a>
              <Link href="/contatti">
                <span className="label">{t('contact.formLabel')}</span>
                <span className="value">{t('contact.formValue')}</span>
              </Link>
            </div>
          </div>
        </section>

        <p className="au-langs">{t('langsNote')}</p>
      </div>
    </div>
  );
}
