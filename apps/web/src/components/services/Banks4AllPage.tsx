'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { getBanks4AllReferralUrl, type Banks4AllReferralEntry } from '@/lib/banks4all-referral';
import './banks4all-hub.css';

type HubLink = {
  key: string;
  entry?: Banks4AllReferralEntry;
  internalHref?: string;
  primary?: boolean;
};

const LINKS: HubLink[] = [
  { key: 'propertyPlanPortal', entry: 'propertyPlanPortal', primary: true },
  { key: 'propertyInvestmentPlan', entry: 'propertyInvestmentPlan' },
  { key: 'verifiedBuyerBadge', entry: 'propertyPlanPortal' },
  { key: 'discoveryCall', entry: 'discoveryCall' },
  { key: 'b4aTransparency', entry: 'transparency' },
  { key: 'easycasaTransparency', internalHref: '/trasparenza' },
];

export function Banks4AllPage() {
  const t = useTranslations('banks4allHub');
  const locale = useLocale();
  const externalHint = t('externalHint', { host: 'banks4all.eu' });
  const points = t.raw('points') as string[];

  return (
    <div className="b4h">
      <section className="b4h-hero">
        <div className="b4h-wrap">
          <p className="b4h-kicker">{t('kicker')}</p>
          <h1>{t('title')}</h1>
          <p className="b4h-lead">{t('lead')}</p>
        </div>
      </section>

      <section className="b4h-section">
        <div className="b4h-wrap">
          <p className="b4h-kicker2">{t('links.kicker')}</p>
          <h2>{t('links.title')}</h2>
          <p className="b4h-sub">{t('links.sub')}</p>
          <ul className="b4h-links">
            {LINKS.map((item) => {
              const title = t(`links.items.${item.key}.title`);
              const body = t(`links.items.${item.key}.body`);
              if (item.internalHref) {
                return (
                  <li key={item.key}>
                    <Link className="b4h-link" href={item.internalHref}>
                      <span className="b4h-link-title">{title}</span>
                      <span className="b4h-link-body">{body}</span>
                    </Link>
                  </li>
                );
              }
              const href = getBanks4AllReferralUrl(locale, item.entry);
              return (
                <li key={item.key}>
                  <a
                    className={item.primary ? 'b4h-link b4h-link--primary' : 'b4h-link'}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${title} — ${externalHint}`}
                  >
                    <span className="b4h-link-title">{title}</span>
                    <span className="b4h-link-body">{body}</span>
                    <span className="b4h-ext">{t('opensExternal')}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="b4h-section b4h-section--ink">
        <div className="b4h-wrap">
          <p className="b4h-kicker-ochre">{t('relation.kicker')}</p>
          <h2>{t('relation.title')}</h2>
          <ul className="b4h-points">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="b4h-note">{t('relation.note')}</p>
        </div>
      </section>
    </div>
  );
}
