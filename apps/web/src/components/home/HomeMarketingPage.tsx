import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getBanks4AllReferralUrl } from '@/lib/banks4all-referral';
import './home-marketing.css';

type Problem = { title: string; body: string };
type Step = { title: string; body: string };

export async function HomeMarketingPage({ locale }: { locale: string }) {
  const t = await getTranslations('home');
  const capacityUrl = getBanks4AllReferralUrl(locale, 'propertyPlanPortal');
  const problems = t.raw('problem.items') as Problem[];
  const steps = t.raw('method.steps') as Step[];

  return (
    <div className="hm">
      <section className="hm-hero" aria-labelledby="hm-hero-title">
        <div className="hm-wrap">
          <p className="hm-brand">
            Easy<span>Casa</span>
          </p>
          <h1 id="hm-hero-title">
            {t('hero.title')}
            <span className="hm-h1-accent">{t('hero.titleAccent')}</span>
          </h1>
          <p className="hm-lede">{t('hero.subtitle')}</p>
          <div className="hm-ctas">
            <Link className="hm-btn hm-btn-primary" href="/valutazione-gratuita">
              {t('hero.ctaPrimary')}
            </Link>
            <Link className="hm-btn hm-btn-secondary" href="/search">
              {t('hero.ctaSecondary')}
            </Link>
          </div>
          <p className="hm-micro">{t('hero.micro')}</p>
        </div>
      </section>

      <section className="hm-section" aria-labelledby="hm-problem-title">
        <div className="hm-wrap">
          <p className="hm-eyebrow">{t('problem.eyebrow')}</p>
          <h2 id="hm-problem-title">{t('problem.title')}</h2>
          <div className="hm-problem-grid">
            {problems.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="hm-section" aria-labelledby="hm-method-title">
        <div className="hm-wrap">
          <p className="hm-eyebrow">{t('method.eyebrow')}</p>
          <h2 id="hm-method-title">{t('method.title')}</h2>
          <ol className="hm-steps">
            {steps.map((step) => (
              <li key={step.title}>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="hm-section" aria-labelledby="hm-sellers-title">
        <div className="hm-wrap hm-split">
          <div>
            <h2 id="hm-sellers-title">{t('sellers.title')}</h2>
            <p className="hm-body">{t('sellers.body')}</p>
            <div className="hm-ctas-inline">
              <Link className="hm-btn hm-btn-primary" href="/valutazione-gratuita">
                {t('sellers.ctaPrimary')}
              </Link>
              <Link className="hm-btn hm-btn-secondary" href="/add">
                {t('sellers.ctaSecondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="hm-section" aria-labelledby="hm-buyers-title">
        <div className="hm-wrap hm-split">
          <div>
            <h2 id="hm-buyers-title">{t('buyers.title')}</h2>
            <p className="hm-body">{t('buyers.body')}</p>
            <div className="hm-ctas-inline">
              <Link className="hm-btn hm-btn-primary" href="/search">
                {t('buyers.ctaPrimary')}
              </Link>
              <a
                className="hm-btn hm-btn-secondary"
                href={capacityUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('buyers.ctaSecondary')}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="hm-section hm-languages" aria-labelledby="hm-languages-title">
        <div className="hm-wrap">
          <h2 id="hm-languages-title">{t('languages.title')}</h2>
          <p className="hm-body">{t('languages.body')}</p>
        </div>
      </section>

      <section className="hm-section hm-transparency" aria-labelledby="hm-transparency-title">
        <div className="hm-wrap">
          <h2 id="hm-transparency-title">{t('transparency.title')}</h2>
          <p className="hm-body">{t('transparency.body')}</p>
          <div className="hm-ctas-inline">
            <Link className="hm-btn hm-btn-ghost" href="/trasparenza">
              {t('transparency.cta')}
            </Link>
          </div>
        </div>
      </section>

      <section className="hm-section hm-close" aria-labelledby="hm-close-title">
        <div className="hm-wrap">
          <h2 id="hm-close-title">{t('close.title')}</h2>
          <div className="hm-ctas-inline">
            <Link className="hm-btn hm-btn-primary" href="/valutazione-gratuita">
              {t('close.cta')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
