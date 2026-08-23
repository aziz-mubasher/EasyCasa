'use client';

import { useTranslations } from 'next-intl';
import { MundidaDevCredit } from '@/components/MundidaDevCredit';
import './acquisto-assistito.css';

const CONTACT_MAILTO = 'mailto:acquisti@easycasaita.com';

type Trap = { term: string; title: string; body: string };
type Step = { no: string; it: string; en: string; what: string; when: string; flag?: boolean };
type Tier = {
  name: string;
  for: string;
  price: string;
  vat: string;
  items: string[];
  cta: string;
  pick?: boolean;
  pill?: string;
};
type Compare = { lbl: string; amt: string; sub: string; zero?: boolean };
type Faq = { q: string; a: string };
type SchedaRow = { dt: string; dd: string; hi?: boolean };

export function AcquistoAssistitoPage() {
  const t = useTranslations('acquistoAssistito');
  const traps = t.raw('traps') as Trap[];
  const steps = t.raw('steps') as Step[];
  const tiers = t.raw('tiers') as Tier[];
  const compare = t.raw('compare') as Compare[];
  const faq = t.raw('faq') as Faq[];
  const scheda = t.raw('scheda.rows') as SchedaRow[];

  return (
    <div className="aa">
      <div className="parcels" aria-hidden="true">
        <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
          <g fill="none" stroke="#14212E" strokeWidth="1" opacity=".07">
            <path d="M-20 210 L280 178 L470 246 L470 470 L232 512 L-20 452 Z" />
            <path d="M280 178 L520 120 L742 190 L720 372 L470 246 Z" />
            <path d="M742 190 L1010 148 L1240 232 L1220 430 L960 402 L720 372 Z" />
            <path d="M232 512 L470 470 L720 372 L760 596 L520 660 L268 618 Z" />
            <path d="M760 596 L960 402 L1220 430 L1240 690 L980 730 Z" />
            <path d="M268 618 L520 660 L560 900 L200 900 Z" />
            <path d="M560 900 L520 660 L760 596 L980 730 L1000 900 Z" />
          </g>
          <g fill="none" stroke="#2C6E9B" strokeWidth="1" opacity=".1" strokeDasharray="3 7">
            <path d="M-20 330 C 240 300, 420 400, 640 330 S 1000 250, 1240 320" />
            <path d="M-20 560 C 260 520, 430 620, 660 550 S 1010 480, 1240 545" />
          </g>
        </svg>
      </div>

      <div className="layer">
        <section className="hero">
          <div className="wrap">
            <div className="reveal">
              <p className="hero-eyebrow">{t('hero.eyebrow')}</p>
              <h1>
                {t('hero.title')}
                <em>{t('hero.titleEm')}</em>
              </h1>
              <p className="standfirst">{t('hero.standfirst')}</p>
              <a className="cta" href="#tiers">
                {t('hero.cta')}
              </a>
              <p className="cta-note">{t('hero.ctaNote')}</p>
            </div>

            <aside className="scheda reveal" style={{ animationDelay: '.12s' }}>
              <h2>{t('scheda.title')}</h2>
              <dl>
                {scheda.map((row) => (
                  <div key={row.dt}>
                    <dt>{row.dt}</dt>
                    <dd className={row.hi ? 'hi' : undefined}>{row.dd}</dd>
                  </div>
                ))}
              </dl>
              <p className="seal">{t('scheda.seal')}</p>
            </aside>
          </div>
        </section>

        <section className="band">
          <div className="wrap">
            <p className="kicker">{t('trapsSection.kicker')}</p>
            <h2>{t('trapsSection.title')}</h2>
            <p className="lede">{t('trapsSection.lede')}</p>
            <div className="traps">
              {traps.map((trap) => (
                <div className="trap" key={trap.term}>
                  <span className="term">{trap.term}</span>
                  <h3>{trap.title}</h3>
                  <p>{trap.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band band--ink">
          <div className="wrap">
            <p className="kicker">{t('path.kicker')}</p>
            <h2>{t('path.title')}</h2>
            <p className="lede">{t('path.lede')}</p>
            <div className="register">
              {steps.map((step) => (
                <div className={`step${step.flag ? ' step--flag' : ''}`} key={step.no}>
                  <span className="no">{step.no}</span>
                  <span className="it">
                    {step.it}
                    <small>{step.en}</small>
                  </span>
                  <p className="what">{step.what}</p>
                  <span className="when">{step.when}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band" id="tiers">
          <div className="wrap">
            <p className="kicker">{t('tiersSection.kicker')}</p>
            <h2>{t('tiersSection.title')}</h2>
            <p className="lede">{t('tiersSection.lede')}</p>
            <div className="tiers">
              {tiers.map((tier) => (
                <div className={`tier${tier.pick ? ' tier--pick' : ''}`} key={tier.name}>
                  {tier.pill ? <span className="pill">{tier.pill}</span> : null}
                  <p className="name">{tier.name}</p>
                  <p className="for">{tier.for}</p>
                  <p className="price">{tier.price}</p>
                  <p className="vat">{tier.vat}</p>
                  <ul>
                    {tier.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <a className="cta" href="#start">
                    {tier.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band">
          <div className="wrap">
            <p className="kicker">{t('commission.kicker')}</p>
            <h2>{t('commission.title')}</h2>
            <p className="lede">{t('commission.lede')}</p>
            <div className="compare">
              {compare.map((row) => (
                <div key={row.lbl}>
                  <p className="lbl">{row.lbl}</p>
                  <p className={`amt${row.zero ? ' zero' : ''}`}>{row.amt}</p>
                  <p className="sub">{row.sub}</p>
                </div>
              ))}
            </div>
            <p className="src">
              <b>{t('commission.srcLead')}</b> {t('commission.srcBody')}
            </p>
          </div>
        </section>

        <section className="band">
          <div className="wrap">
            <p className="kicker">{t('faqSection.kicker')}</p>
            <h2>{t('faqSection.title')}</h2>
            <div className="faq">
              {faq.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="band close" id="start">
          <div className="wrap">
            <p className="kicker">{t('close.kicker')}</p>
            <h2>{t('close.title')}</h2>
            <p className="lede">{t('close.lede')}</p>
            <a className="cta" href={CONTACT_MAILTO}>
              {t('close.cta')}
            </a>
            <p className="cta-note">{t('close.ctaNote')}</p>
          </div>
        </section>

        <footer className="aa-footer">
          <div className="wrap">
            <div>
              {t('footer.left')}
              <MundidaDevCredit inline leadingMiddot />
            </div>
            <div>{t('footer.right')}</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
