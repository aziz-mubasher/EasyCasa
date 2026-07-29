import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import './privacy-doc.css';

type Channel = {
  tag: string;
  value: string;
  href: string;
  body: string;
  when: string;
  cta: string;
  ghost?: boolean;
};

type RouteRow = {
  key: string;
  desc: string;
  descLink?: string;
  descAfter?: string;
  address: string;
  href?: string;
  todo?: boolean;
};

type IdentRow = { label: string; value: string; todo?: boolean };

export async function ContattiView() {
  const t = await getTranslations('contatti');
  const channels = t.raw('channels') as Channel[];
  const routes = t.raw('routes') as RouteRow[];
  const ident = t.raw('ident.rows') as IdentRow[];

  return (
    <div className="pd">
      <div className="pd-wrap pd-wrap--contact">
        <div className="pd-head pd-head--flush">
          <h1>{t('title')}</h1>
          <p className="pd-sub">{t('sub')}</p>
        </div>

        <div className="pd-chans">
          {channels.map((ch) => (
            <div className="pd-chan" key={ch.tag}>
              <p className="tag">{ch.tag}</p>
              <p className="val">
                <a href={ch.href}>{ch.value}</a>
              </p>
              <p>{ch.body}</p>
              <p className="when">{ch.when}</p>
              <a className={ch.ghost ? 'pd-btn-ghost' : 'pd-btn-ink'} href={ch.href}>
                {ch.cta}
              </a>
            </div>
          ))}
        </div>

        <h2 className="pd-h">{t('routesTitle')}</h2>
        <p className="pd-lede">{t('routesLede')}</p>

        <div className="pd-routes">
          {routes.map((row) => (
            <div className="pd-route" key={row.key}>
              <span className="k">{row.key}</span>
              <span className="d">
                {row.desc}
                {row.descLink ? (
                  <>
                    {' '}
                    <Link href="/privacy">{row.descLink}</Link>
                    {row.descAfter ?? ''}
                  </>
                ) : null}
              </span>
              <span className={row.todo ? 'a todo' : 'a'}>
                {row.href ? <a href={row.href}>{row.address}</a> : row.address}
              </span>
            </div>
          ))}
        </div>

        <div className="pd-note">
          <b>{t('note.tag')}</b>
          {t('note.body')}
        </div>

        <div className="pd-ident">
          <h2>{t('ident.title')}</h2>
          <dl>
            {ident.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd className={row.todo ? 'todo' : undefined}>{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="foot">
            {t('ident.footBefore')}
            <br />
            {t('ident.footOdrBefore')}{' '}
            <a href="https://ec.europa.eu/consumers/odr" rel="noopener noreferrer" target="_blank">
              {t('ident.footOdrLink')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
