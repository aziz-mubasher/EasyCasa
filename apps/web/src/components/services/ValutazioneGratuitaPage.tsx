'use client';

import { useState, useId, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import './valutazione-gratuita.css';

type Compare = { tag: string; title: string; body: string; hi?: boolean };
type Factor = { no: string; what: string; sub: string; body: string };
type Faq = { q: string; a: string };

const CONDITION_KEYS = ['renovate', 'normal', 'renovated', 'new'] as const;

export function ValutazioneGratuitaPage() {
  const t = useTranslations('valutazioneGratuita');
  const id = useId();
  const usual = t.raw('compare.usual') as Compare;
  const here = t.raw('compare.here') as Compare;
  const optionA = t.raw('next.optionA') as Compare;
  const optionB = t.raw('next.optionB') as Compare;
  const factors = t.raw('method.factors') as Factor[];
  const faq = t.raw('faq.items') as Faq[];

  const [address, setAddress] = useState('');
  const [size, setSize] = useState('');
  const [condition, setCondition] = useState<(typeof CONDITION_KEYS)[number]>('normal');
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    document.getElementById('vg-result')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  return (
    <div className="vg">
      <section className="hero">
        <div className="wrap">
          <div>
            <p className="vg-eyebrow">{t('hero.eyebrow')}</p>
            <h1>
              {t('hero.title')}
              <em>{t('hero.titleEm')}</em>
            </h1>
            <p className="standfirst">{t('hero.standfirst')}</p>
            <p className="promise">
              {t('hero.promise1')}
              <br />
              {t('hero.promise2')}
              <br />
              {t('hero.promise3')}
            </p>
          </div>

          <div className="card" id="calcola">
            <h2>{t('form.title')}</h2>
            <div className="in">
              <form onSubmit={onSubmit} noValidate>
                <div className="f">
                  <label htmlFor={`${id}-ind`}>{t('form.address')}</label>
                  <input
                    id={`${id}-ind`}
                    type="text"
                    required
                    autoComplete="street-address"
                    placeholder={t('form.addressPlaceholder')}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="pair">
                  <div className="f">
                    <label htmlFor={`${id}-mq`}>{t('form.size')}</label>
                    <input
                      id={`${id}-mq`}
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder={t('form.sizePlaceholder')}
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                    />
                  </div>
                  <div className="f">
                    <label htmlFor={`${id}-st`}>{t('form.condition')}</label>
                    <select
                      id={`${id}-st`}
                      value={condition}
                      onChange={(e) =>
                        setCondition(e.target.value as (typeof CONDITION_KEYS)[number])
                      }
                    >
                      {CONDITION_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {t(`form.conditions.${key}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button className="cta" type="submit">
                  {t('form.cta')}
                </button>
                <p className="small">{t('form.note')}</p>
              </form>

              {submitted ? (
                <div className="form-result" id="vg-result" role="status">
                  <p>{t('form.resultBody')}</p>
                  <Link href="/add" className="cta">
                    {t('form.resultCta')}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <p className="kicker">{t('compare.kicker')}</p>
          <h2>{t('compare.title')}</h2>
          <p className="lede">{t('compare.lede')}</p>
          <div className="two">
            <div>
              <span className="tag">{usual.tag}</span>
              <h3>{usual.title}</h3>
              <p>{usual.body}</p>
            </div>
            <div className="hi">
              <span className="tag">{here.tag}</span>
              <h3>{here.title}</h3>
              <p>{here.body}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band band--ink" id="metodo">
        <div className="wrap">
          <p className="kicker">{t('method.kicker')}</p>
          <h2>{t('method.title')}</h2>
          <p className="lede">{t('method.lede')}</p>
          <div className="reg">
            {factors.map((row) => (
              <div className="row" key={row.no}>
                <span className="no">{row.no}</span>
                <span className="what">
                  {row.what}
                  <small>{row.sub}</small>
                </span>
                <p>{row.body}</p>
              </div>
            ))}
          </div>
          <div className="rail" aria-label={t('method.exampleAria')}>
            <p className="fig">{t('method.exampleFig')}</p>
            <p className="z">{t('method.exampleZone')}</p>
            <div className="track">
              <span className="fill" />
            </div>
            <div className="lg">
              <span>{t('method.exampleMin')}</span>
              <span>{t('method.exampleMax')}</span>
            </div>
            <p className="src">{t('method.exampleSrc')}</p>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <p className="kicker">{t('next.kicker')}</p>
          <h2>{t('next.title')}</h2>
          <p className="lede">{t('next.lede')}</p>
          <div className="two">
            <div>
              <span className="tag">{optionA.tag}</span>
              <h3>{optionA.title}</h3>
              <p>{optionA.body}</p>
            </div>
            <div className="hi">
              <span className="tag">{optionB.tag}</span>
              <h3>{optionB.title}</h3>
              <p>{optionB.body}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <p className="kicker">{t('faq.kicker')}</p>
          <h2>{t('faq.title')}</h2>
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

      <section className="band close">
        <div className="wrap">
          <p className="kicker">{t('close.kicker')}</p>
          <h2>{t('close.title')}</h2>
          <p className="lede">{t('close.lede')}</p>
          <a className="cta" href="#calcola">
            {t('close.cta')}
          </a>
        </div>
      </section>

      <footer className="vg-footer">
        <div className="wrap">
          <div>{t('footer.left')}</div>
          <div>{t('footer.right')}</div>
        </div>
      </footer>
    </div>
  );
}
