import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import './privacy-doc.css';

type TocItem = { id: string; label: string };

const SECTION_IDS = [
  's1',
  's2',
  's3',
  's4',
  's5',
  's6',
  's7',
  's8',
  's9',
  's10',
  's11',
] as const;

export async function TermsConditionsView() {
  const t = await getTranslations('termsConditions');
  const toc = t.raw('toc') as TocItem[];

  return (
    <div className="pd">
      <div className="pd-head">
        <div className="pd-wrap">
          <h1>{t('title')}</h1>
          <p className="pd-meta">
            <span>
              {t('meta.versionLabel')} <b>{t('meta.version')}</b>
            </span>
            <span>
              {t('meta.inForceLabel')} <b>{t('meta.inForce')}</b>
            </span>
            <span>
              {t('meta.updatedLabel')} <b>{t('meta.updated')}</b>
            </span>
            <span>{t('meta.italianPrevails')}</span>
          </p>
        </div>
      </div>

      <div className="pd-wrap pd-cols">
        <nav className="pd-toc" aria-label={t('tocLabel')}>
          <h2>{t('tocLabel')}</h2>
          <ol>
            {toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div>
          {SECTION_IDS.map((key, i) => {
            const n = String(i + 1).padStart(2, '0');
            const id = `t${i + 1}`;

            return (
              <section className="pd-sec" key={id}>
                <h2 className="pd-s" id={id}>
                  <span className="n">{n}</span>
                  {t(`${key}.title`)}
                </h2>
                <div className="pd-brief">
                  <span className="tag">{t('briefTag')}</span>
                  {key === 's9' ? (
                    <p>
                      {t('s9.briefBefore')}{' '}
                      <Link href="/privacy">{t('s9.briefLink')}</Link>
                      {t('s9.briefAfter')}
                    </p>
                  ) : key === 's10' ? (
                    <>
                      <p>
                        {t('s10.briefBefore')}{' '}
                        <a href="mailto:reclami@easycasaita.com">{t('s10.briefEmail')}</a>
                        {t('s10.briefAfter')}
                      </p>
                      <p>{t('s10.brief2')}</p>
                    </>
                  ) : (
                    (t.raw(`${key}.briefs`) as string[]).map((p, idx) => (
                      <p key={`${key}-${idx}`}>{p}</p>
                    ))
                  )}
                </div>
                <details className="pd-full">
                  <summary>{t('fullText')}</summary>
                  <div className="body">
                    <div className="pd-todo">
                      <b>{t('todoLabel')}</b>
                      {t(`${key}.fullTodo`)}
                    </div>
                  </div>
                </details>
              </section>
            );
          })}

          <div className="pd-help">
            <h3>{t('help.title')}</h3>
            <p>{t('help.body')}</p>
            <Link className="pd-btn" href="/contatti">
              {t('help.cta')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
