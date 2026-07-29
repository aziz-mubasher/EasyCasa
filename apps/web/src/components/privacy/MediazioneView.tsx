import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import './privacy-doc.css';

type CheckItem = { title: string; body: string };
type OursRow = { label: string; value: string };

export async function MediazioneView() {
  const t = await getTranslations('mediationPage');
  const lawLines = t.raw('law.lines') as string[];
  const trapParas = t.raw('trap.paras') as string[];
  const oursRows = t.raw('ours.rows') as OursRow[];
  const checks = t.raw('checks.items') as CheckItem[];

  return (
    <div className="pd pd-med">
      <div className="pd-wrap pd-wrap--narrow">
        <div className="pd-head pd-head--flush">
          <p className="pd-eyebrow">{t('eyebrow')}</p>
          <h1>
            {t('titleBefore')}
            <br />
            <em>{t('titleEm')}</em>
          </h1>
          <p className="pd-sub pd-sub--wide">{t('sub')}</p>
          <p className="pd-stamp">{t('stamp')}</p>
        </div>

        <section className="pd-med-sec">
          <h2>{t('law.title')}</h2>
          <p>{t('law.p1')}</p>
          <p>{t('law.p2')}</p>
          <div className="pd-law">
            {lawLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        </section>

        <section className="pd-med-sec">
          <h2>{t('origin.title')}</h2>
          <p>{t('origin.p1')}</p>
          <p>
            {t('origin.p2Before')} <strong>{t('origin.p2Strong')}</strong>
            {t('origin.p2After')}
          </p>
          <div className="pd-pull pd-pull--warn">
            <b>{t('trap.tag')}</b>
            {trapParas.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
          <p>{t('origin.p3')}</p>
        </section>

        <section className="pd-med-sec">
          <h2>{t('when.title')}</h2>
          <p>
            {t('when.p1Before')} <strong>{t('when.p1Strong')}</strong>
            {t('when.p1After')}
          </p>
          <p>{t('when.p2')}</p>
        </section>

        <div className="pd-ours">
          <h2>{t('ours.title')}</h2>
          <p>{t('ours.intro')}</p>
          {oursRows.map((row) => (
            <div className="row" key={row.label}>
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
          <p className="pd-ours-gap">{t('ours.outro1')}</p>
          <p className="pd-ours-last">{t('ours.outro2')}</p>
        </div>

        <section className="pd-med-sec">
          <h2>{t('checks.title')}</h2>
          <p>{t('checks.lede')}</p>
          <ol className="pd-check">
            {checks.map((item) => (
              <li key={item.title}>
                <b>{item.title}</b>
                <span>{item.body}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="pd-med-sec">
          <h2>{t('why.title')}</h2>
          <p>{t('why.p1')}</p>
          <p>{t('why.p2')}</p>
          <div className="pd-pull">
            <b>{t('questions.tag')}</b>
            <p>
              {t('questions.beforeWa')}{' '}
              <a href="https://wa.me/393793306605">{t('questions.wa')}</a> {t('questions.or')}{' '}
              <a href="mailto:info@easycasaita.com">{t('questions.email')}</a>
              {t('questions.after')}
            </p>
          </div>
        </section>

        <div className="pd-med-ident">
          {t('ident.line1')}
          <br />
          {t('ident.line2Before')} <span className="todo">{t('ident.regTodo')}</span>
          <br />
          {t('ident.omi')}
          <br />
          <br />
          {t('ident.banks')}
          <br />
          <br />
          <Link href="/trasparenza">{t('ident.linkTransparency')}</Link>
          {' · '}
          <Link href="/legal/terms">{t('ident.linkTerms')}</Link>
          {' · '}
          <Link href="/contatti">{t('ident.linkContacts')}</Link>
        </div>
      </div>
    </div>
  );
}
