'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ITALIAN_PROVINCES } from '@easycasa/shared';
import { Link } from '@/i18n/routing';
import { MundidaDevCredit } from '@/components/MundidaDevCredit';
import { submitAsteLead } from '@/lib/aste-api';
import { PRODUCT_EVENTS, trackProduct } from '@/lib/product-analytics';
import './aste-landing.css';

type ProblemCard = { title: string; body: string };
type FaqItem = { q: string; a: string };

type BuyerType = 'prima_casa' | 'investimento' | 'curiosita' | '';
type Lang = 'it' | 'en' | 'es';

export function AsteLandingPage() {
  const t = useTranslations('aste');
  const locale = useLocale() as Lang;
  const id = useId();

  const problems = t.raw('problem.cards') as ProblemCard[];
  const faqs = t.raw('faq.items') as FaqItem[];

  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState<Lang>(locale);
  const [province, setProvince] = useState('');
  const [buyerType, setBuyerType] = useState<BuyerType>('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [guideUrl, setGuideUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; consent?: string }>({});

  useEffect(() => {
    trackProduct(PRODUCT_EVENTS.ASTE_PAGE_VIEW, { locale, language: locale });
  }, [locale]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: { email?: string; consent?: string } = {};
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = t('form.errors.email');
    }
    if (!consent) {
      nextErrors.consent = t('form.errors.consent');
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setStatus('submitting');
    setErrorMsg(null);
    try {
      const res = await submitAsteLead({
        email: email.trim(),
        language,
        locale,
        consent: true,
        province: province || null,
        buyerType: buyerType || null,
      });
      trackProduct(PRODUCT_EVENTS.ASTE_SIGNUP_SUBMITTED, {
        language,
        locale,
        province: province || null,
        buyerType: buyerType || null,
        duplicate: res.duplicate,
      });
      setGuideUrl(res.guideUrl);
      setStatus('ok');
    } catch {
      setStatus('error');
      setErrorMsg(t('form.errors.submit'));
    }
  }

  return (
    <div className="aste">
      <section className="aste-hero" aria-labelledby={`${id}-hero`}>
        <div className="aste-wrap">
          <p className="aste-brand">EasyCasa</p>
          <h1 id={`${id}-hero`}>{t('hero.title')}</h1>
          <p className="aste-lead">{t('hero.sub')}</p>
          <a className="aste-cta" href="#guida">
            {t('hero.cta')}
          </a>
        </div>
      </section>

      <section className="aste-section" aria-labelledby={`${id}-problem`}>
        <div className="aste-wrap">
          <p className="aste-kicker">{t('problem.kicker')}</p>
          <h2 id={`${id}-problem`}>{t('problem.title')}</h2>
          <p className="aste-sub">{t('problem.sub')}</p>
          <div className="aste-problems">
            {problems.map((card) => (
              <article key={card.title} className="aste-problem">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="aste-section aste-coming" aria-labelledby={`${id}-coming`}>
        <div className="aste-wrap aste-coming-grid">
          <div>
            <p className="aste-badge">{t('coming.badge')}</p>
            <h2 id={`${id}-coming`}>{t('coming.title')}</h2>
            <p className="aste-sub">{t('coming.body')}</p>
          </div>
          <div className="aste-semaforo" aria-hidden="true">
            <svg viewBox="0 0 120 200" width="120" height="200" role="img">
              <title>{t('coming.semaforoTitle')}</title>
              <rect x="20" y="10" width="80" height="180" rx="12" fill="#14212e" />
              <circle cx="60" cy="50" r="22" fill="#c45c4a" opacity="0.95" />
              <circle cx="60" cy="100" r="22" fill="#c08a1e" opacity="0.95" />
              <circle cx="60" cy="150" r="22" fill="#1f6f5c" opacity="0.95" />
            </svg>
            <p className="aste-semaforo-caption">{t('coming.semaforoCaption')}</p>
          </div>
        </div>
      </section>

      <section id="guida" className="aste-section aste-signup" aria-labelledby={`${id}-signup`}>
        <div className="aste-wrap aste-signup-inner">
          <p className="aste-kicker">{t('signup.kicker')}</p>
          <h2 id={`${id}-signup`}>{t('signup.title')}</h2>
          <p className="aste-sub">{t('signup.sub')}</p>

          {status === 'ok' && guideUrl ? (
            <div className="aste-success" role="status">
              <p>{t('form.success')}</p>
              <a className="aste-cta" href={guideUrl}>
                {t('form.openGuide')}
              </a>
              <p className="aste-success-note">{t('form.emailNote')}</p>
            </div>
          ) : (
            <form className="aste-form" onSubmit={onSubmit} noValidate>
              <div className="aste-field">
                <label htmlFor={`${id}-email`}>
                  {t('form.email')} <span aria-hidden="true">*</span>
                </label>
                <input
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={fieldErrors.email ? `${id}-email-err` : undefined}
                />
                {fieldErrors.email ? (
                  <p id={`${id}-email-err`} className="aste-field-error" role="alert">
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>

              <div className="aste-field">
                <label htmlFor={`${id}-lang`}>{t('form.language')}</label>
                <select
                  id={`${id}-lang`}
                  name="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Lang)}
                >
                  <option value="it">{t('form.langIt')}</option>
                  <option value="en">{t('form.langEn')}</option>
                  <option value="es">{t('form.langEs')}</option>
                </select>
              </div>

              <div className="aste-field">
                <label htmlFor={`${id}-province`}>{t('form.province')}</label>
                <select
                  id={`${id}-province`}
                  name="province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                >
                  <option value="">{t('form.provinceNone')}</option>
                  {ITALIAN_PROVINCES.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="aste-field">
                <label htmlFor={`${id}-buyer`}>{t('form.buyerType')}</label>
                <select
                  id={`${id}-buyer`}
                  name="buyerType"
                  value={buyerType}
                  onChange={(e) => setBuyerType(e.target.value as BuyerType)}
                >
                  <option value="">{t('form.buyerNone')}</option>
                  <option value="prima_casa">{t('form.buyerPrima')}</option>
                  <option value="investimento">{t('form.buyerInvest')}</option>
                  <option value="curiosita">{t('form.buyerCuriosity')}</option>
                </select>
              </div>

              <div className="aste-consent">
                <input
                  id={`${id}-consent`}
                  name="consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                  aria-invalid={fieldErrors.consent ? true : undefined}
                  aria-describedby={`${id}-consent-desc${fieldErrors.consent ? ` ${id}-consent-err` : ''}`}
                />
                <div>
                  <label htmlFor={`${id}-consent`} id={`${id}-consent-desc`}>
                    {t('form.consentBefore')}
                    <Link href="/legal/privacy" className="aste-inline-link">
                      {t('form.privacyLink')}
                    </Link>
                    {t('form.consentAfter')}
                  </label>
                  <p className="aste-counsel">{t('form.counselMark')}</p>
                  {fieldErrors.consent ? (
                    <p id={`${id}-consent-err`} className="aste-field-error" role="alert">
                      {fieldErrors.consent}
                    </p>
                  ) : null}
                </div>
              </div>

              {errorMsg ? (
                <p className="aste-field-error" role="alert">
                  {errorMsg}
                </p>
              ) : null}

              <button className="aste-cta aste-submit" type="submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? t('form.submitting') : t('form.submit')}
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="aste-section" aria-labelledby={`${id}-faq`}>
        <div className="aste-wrap">
          <p className="aste-kicker">{t('faq.kicker')}</p>
          <h2 id={`${id}-faq`}>{t('faq.title')}</h2>
          <div className="aste-faq">
            {faqs.map((item) => (
              <details key={item.q} className="aste-faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="aste-foot">
        <div className="aste-wrap">
          <p>{t('disclaimer')}</p>
          <p className="aste-counsel">{t('counselMark')}</p>
          <MundidaDevCredit />
        </div>
      </footer>
    </div>
  );
}
