import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import './privacy-doc.css';

type Pillar = { tag: string; title: string; paras: string[] };
type PayRow = { who: string; amt: string; zero?: boolean };
type Rule = { title: string; body: string };

export async function TrasparenzaView() {
  const t = await getTranslations('transparencyPage');
  const pillars = t.raw('model.pillars') as Pillar[];
  const payRows = t.raw('pay.rows') as PayRow[];
  const rules = t.raw('rules.items') as Rule[];
  const banksLimits = t.raw('banks.items') as string[];
  const limits = t.raw('limits.items') as string[];

  return (
    <div className="pd pd-tx">
      <div className="pd-wrap pd-tx-head">
        <p className="pd-eyebrow">{t('eyebrow')}</p>
        <h1>
          {t('titleBefore')}
          <br />
          <em>{t('titleEm')}</em>
        </h1>
        <p className="pd-sub pd-sub--wide">{t('sub')}</p>
      </div>

      <section className="pd-band">
        <div className="pd-wrap">
          <p className="pd-kicker">{t('model.kicker')}</p>
          <h2>{t('model.title')}</h2>
          <div className="pd-three">
            {pillars.map((col) => (
              <div key={col.tag}>
                <span className="tag">{col.tag}</span>
                <h3>{col.title}</h3>
                {col.paras.map((p) => (
                  <p key={p.slice(0, 36)}>{p}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pd-band">
        <div className="pd-wrap">
          <p className="pd-kicker">{t('pay.kicker')}</p>
          <h2>{t('pay.title')}</h2>
          <p className="pd-lede">{t('pay.lede')}</p>
          <div className="pd-pay">
            {payRows.map((row) => (
              <div className="row" key={row.who}>
                <span className="who">{row.who}</span>
                <span className={row.zero ? 'amt no' : 'amt'}>{row.amt}</span>
              </div>
            ))}
          </div>
          <div className="pd-note">
            <b>{t('pay.noteTag')}</b>
            {t('pay.note')}
          </div>
        </div>
      </section>

      <section className="pd-band pd-band--ink">
        <div className="pd-wrap">
          <p className="pd-kicker">{t('rules.kicker')}</p>
          <h2>{t('rules.title')}</h2>
          <p className="pd-lede">{t('rules.lede')}</p>
          <div className="pd-reg">
            {rules.map((item, i) => (
              <div className="r" key={item.title}>
                <span className="no">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <p className="t">{item.title}</p>
                  <p>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pd-band">
        <div className="pd-wrap">
          <p className="pd-kicker">{t('sources.kicker')}</p>
          <h2>{t('sources.title')}</h2>
          <p className="pd-lede">{t('sources.lede')}</p>
          <div className="pd-note">
            <b>{t('sources.noteTag')}</b>
            {t('sources.note')}
          </div>
          <p className="pd-tx-aside">{t('sources.aside')}</p>
        </div>
      </section>

      <section className="pd-band">
        <div className="pd-wrap">
          <p className="pd-kicker">{t('banks.kicker')}</p>
          <h2>{t('banks.title')}</h2>
          <p className="pd-lede pd-lede--wide">{t('banks.lede')}</p>
          <ul className="pd-limits">
            {banksLimits.map((item) => (
              <li key={item.slice(0, 40)}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pd-band">
        <div className="pd-wrap">
          <p className="pd-kicker">{t('limits.kicker')}</p>
          <h2>{t('limits.title')}</h2>
          <p className="pd-lede">{t('limits.lede')}</p>
          <ul className="pd-limits">
            {limits.map((item) => (
              <li key={item.slice(0, 40)}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className="pd-wrap pd-tx-ident-wrap">
        <div className="pd-ident">
          <h2>{t('ident.title')}</h2>
          <p>
            {t('ident.line1')}
            <br />
            {t('ident.line2Before')} <span className="todo">{t('ident.regTodo')}</span>
            <br />
            {t('ident.sedeBefore')} <span className="todo">{t('ident.todo')}</span>
            {' · '}
            {t('ident.reaBefore')} <span className="todo">{t('ident.todo')}</span>
            {' · '}
            {t('ident.pecBefore')} <span className="todo">{t('ident.todo')}</span>
          </p>
          <p>{t('ident.omi')}</p>
          <p>{t('ident.banks')}</p>
          <p>
            <Link href="/legal/mediation">{t('ident.linkMediation')}</Link>
            {' · '}
            <Link href="/legal/terms">{t('ident.linkTerms')}</Link>
            {' · '}
            <Link href="/legal/privacy">{t('ident.linkPrivacy')}</Link>
            {' · '}
            <Link href="/contatti">{t('ident.linkContacts')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
