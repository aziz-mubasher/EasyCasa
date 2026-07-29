import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import './privacy-doc.css';

type TocItem = { id: string; label: string };
type DataRow = { cat: string; examples: string; from: string };
type PurposeRow = { purpose: string; basis: string };
type RightRow = { right: string; where: string; link?: boolean };

export async function PrivacyPolicyView() {
  const t = await getTranslations('privacyPolicy');
  const toc = t.raw('toc') as TocItem[];
  const dataRows = t.raw('dataRows') as DataRow[];
  const purposeRows = t.raw('purposeRows') as PurposeRow[];
  const rightRows = t.raw('rightRows') as RightRow[];

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
          <section className="pd-sec">
            <h2 className="pd-s" id="t1">
              <span className="n">01</span>
              {t('s1.title')}
            </h2>
            <div className="pd-brief">
              <span className="tag">{t('briefTag')}</span>
              <p>{t('s1.brief')}</p>
            </div>
            <div className="pd-todo">
              <b>{t('todoLabel')}</b>
              {t('s1.todo')}
            </div>
          </section>

          <section className="pd-sec">
            <h2 className="pd-s" id="t2">
              <span className="n">02</span>
              {t('s2.title')}
            </h2>
            <div className="pd-brief">
              <span className="tag">{t('briefTag')}</span>
              <p>{t('s2.brief')}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>{t('s2.thCat')}</th>
                  <th>{t('s2.thExamples')}</th>
                  <th>{t('s2.thFrom')}</th>
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row) => (
                  <tr key={row.cat}>
                    <td>{row.cat}</td>
                    <td>{row.examples}</td>
                    <td className="mono">{row.from}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details className="pd-full">
              <summary>{t('fullText')}</summary>
              <div className="body">
                <div className="pd-todo">
                  <b>{t('todoLabel')}</b>
                  {t('s2.fullTodo')}
                </div>
              </div>
            </details>
          </section>

          <section className="pd-sec">
            <h2 className="pd-s" id="t3">
              <span className="n">03</span>
              {t('s3.title')}
            </h2>
            <div className="pd-brief">
              <span className="tag">{t('briefTag')}</span>
              <p>{t('s3.brief')}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>{t('s3.thPurpose')}</th>
                  <th>{t('s3.thBasis')}</th>
                </tr>
              </thead>
              <tbody>
                {purposeRows.map((row) => (
                  <tr key={row.purpose}>
                    <td>{row.purpose}</td>
                    <td className="mono">{row.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details className="pd-full">
              <summary>{t('fullText')}</summary>
              <div className="body">
                <div className="pd-todo">
                  <b>{t('todoLabel')}</b>
                  {t('s3.fullTodo')}
                </div>
              </div>
            </details>
          </section>

          <section className="pd-sec">
            <h2 className="pd-s" id="t4">
              <span className="n">04</span>
              {t('s4.title')}
            </h2>
            <div className="pd-brief">
              <span className="tag">{t('briefTag')}</span>
              <p>{t('s4.brief')}</p>
            </div>
            <details className="pd-full">
              <summary>{t('fullText')}</summary>
              <div className="body">
                <div className="pd-todo">
                  <b>{t('todoLabel')}</b>
                  {t('s4.fullTodo')}
                </div>
              </div>
            </details>
          </section>

          <section className="pd-sec">
            <h2 className="pd-s" id="t5">
              <span className="n">05</span>
              {t('s5.title')}
            </h2>
            <div className="pd-brief">
              <span className="tag">{t('briefTag')}</span>
              <p>{t('s5.brief')}</p>
            </div>
            <div className="pd-todo">
              <b>{t('todoLabel')}</b>
              {t('s5.todo')}
            </div>
          </section>

          <section className="pd-sec">
            <h2 className="pd-s" id="t6">
              <span className="n">06</span>
              {t('s6.title')}
            </h2>
            <div className="pd-brief">
              <span className="tag">{t('briefTag')}</span>
              <p>{t('s6.brief')}</p>
            </div>
            <div className="pd-todo">
              <b>{t('todoLabel')}</b>
              {t('s6.todo')}
            </div>
          </section>

          <section className="pd-sec">
            <h2 className="pd-s" id="t7">
              <span className="n">07</span>
              {t('s7.title')}
            </h2>
            <div className="pd-brief">
              <span className="tag">{t('briefTag')}</span>
              <p>{t('s7.brief')}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>{t('s7.thRight')}</th>
                  <th>{t('s7.thWhere')}</th>
                </tr>
              </thead>
              <tbody>
                {rightRows.map((row) => (
                  <tr key={row.right}>
                    <td>{row.right}</td>
                    <td className="mono">
                      {row.link ? <Link href="/privacy">{row.where}</Link> : row.where}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="pd-sec">
            <h2 className="pd-s" id="t8">
              <span className="n">08</span>
              {t('s8.title')}
            </h2>
            <div className="pd-brief">
              <span className="tag">{t('briefTag')}</span>
              <p>
                {t('s8.briefBefore')}{' '}
                <Link href="/privacy">{t('s8.briefLink')}</Link> {t('s8.briefAfter')}
              </p>
            </div>
            <div className="pd-todo">
              <b>{t('todoLabel')}</b>
              {t('s8.todo')}
            </div>
          </section>

          <section className="pd-sec">
            <h2 className="pd-s" id="t9">
              <span className="n">09</span>
              {t('s9.title')}
            </h2>
            <div className="pd-brief">
              <span className="tag">{t('briefTag')}</span>
              <p>{t('s9.brief')}</p>
            </div>
          </section>

          <div className="pd-help">
            <h3>{t('help.title')}</h3>
            <p>{t('help.body')}</p>
            <Link className="pd-btn" href="/privacy">
              {t('help.cta')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
