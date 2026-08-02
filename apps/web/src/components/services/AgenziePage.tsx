'use client';

import { useId, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import './agenzie.css';

const APPLY_MAILTO = 'mailto:info@easycasaita.com';

type Benefit = { num: string; title: string; body: string };
type Step = { title: string; body: string };
type Honest = { title: string; body: string };

export function AgenziePage() {
  const t = useTranslations('agenzie');
  const id = useId();
  const benefits = t.raw('benefits.items') as Benefit[];
  const steps = t.raw('how.steps') as Step[];
  const rules = t.raw('rules.items') as string[];
  const honest = t.raw('honest.items') as Honest[];
  const pills = t.raw('hero.pills') as string[];

  const [agency, setAgency] = useState('');
  const [piva, setPiva] = useState('');
  const [rea, setRea] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gestionale, setGestionale] = useState('');
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(t('form.mailSubject', { agency }));
    const body = encodeURIComponent(
      [
        t('form.mailAgency', { agency }),
        t('form.mailPiva', { piva }),
        t('form.mailRea', { rea }),
        t('form.mailEmail', { email }),
        t('form.mailPhone', { phone }),
        gestionale ? t('form.mailGestionale', { gestionale }) : null,
      ]
        .filter(Boolean)
        .join('\n'),
    );
    window.location.href = `${APPLY_MAILTO}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <div className="ag">
      <section className="hero">
        <div className="wrap">
          <p className="kicker">{t('hero.kicker')}</p>
          <h1>{t('hero.title')}</h1>
          <p className="lead">{t('hero.lead')}</p>
          <div className="cta-row">
            <a className="cta" href="#candidatura">
              {t('hero.cta')}
            </a>
            <a className="cta ghost" href="#come-funziona">
              {t('hero.ctaSecondary')}
            </a>
          </div>
          <div className="pill-row">
            {pills.map((pill) => (
              <span className="pill" key={pill}>
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="vantaggi">
        <div className="wrap">
          <p className="kicker2">{t('benefits.kicker')}</p>
          <h2>{t('benefits.title')}</h2>
          <p className="sub">{t('benefits.sub')}</p>
          <div className="grid">
            {benefits.map((item) => (
              <div className="benefit" key={item.num}>
                <p className="num">{item.num}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="come-funziona" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <p className="kicker2">{t('how.kicker')}</p>
          <h2>{t('how.title')}</h2>
          <div className="steps">
            {steps.map((step) => (
              <div className="step" key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="regole" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <p className="kicker2">{t('rules.kicker')}</p>
          <h2>{t('rules.title')}</h2>
          <p className="sub">{t('rules.sub')}</p>
          <div className="rules">
            <ul>
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
          <p className="disclose">{t('rules.disclose')}</p>
        </div>
      </section>

      <section id="trasparenza" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="honest">
            <p className="kicker">{t('honest.kicker')}</p>
            <h2>{t('honest.title')}</h2>
            {honest.map((item) => (
              <p key={item.title}>
                <b>{item.title}</b> {item.body}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section id="candidatura" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <p className="kicker2">{t('form.kicker')}</p>
          <h2>{t('form.title')}</h2>
          <p className="sub">{t('form.sub')}</p>
          <form className="apply" onSubmit={onSubmit} noValidate>
            <label htmlFor={`${id}-ag`}>{t('form.agency')}</label>
            <input
              id={`${id}-ag`}
              name="agenzia"
              type="text"
              required
              autoComplete="organization"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
            />
            <label htmlFor={`${id}-piva`}>{t('form.piva')}</label>
            <input
              id={`${id}-piva`}
              name="piva"
              type="text"
              inputMode="numeric"
              required
              value={piva}
              onChange={(e) => setPiva(e.target.value)}
            />
            <label htmlFor={`${id}-rea`}>{t('form.rea')}</label>
            <input
              id={`${id}-rea`}
              name="rea"
              type="text"
              required
              placeholder={t('form.reaPlaceholder')}
              value={rea}
              onChange={(e) => setRea(e.target.value)}
            />
            <label htmlFor={`${id}-email`}>{t('form.email')}</label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor={`${id}-tel`}>{t('form.phone')}</label>
            <input
              id={`${id}-tel`}
              name="telefono"
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <label htmlFor={`${id}-gest`}>{t('form.gestionale')}</label>
            <input
              id={`${id}-gest`}
              name="gestionale"
              type="text"
              placeholder={t('form.gestionalePlaceholder')}
              value={gestionale}
              onChange={(e) => setGestionale(e.target.value)}
            />
            <button type="submit">{t('form.submit')}</button>
            {sent ? <p className="sent">{t('form.sent')}</p> : null}
            <p className="note">
              {t.rich('form.note', {
                privacy: (chunks) => <Link href="/legal/privacy">{chunks}</Link>,
              })}
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
