'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { getBanks4AllReferralUrl } from '@/lib/banks4all-referral';
import { isListingLandingPath } from '@/lib/listing-landing';
import { isMarketingServicePath } from '@/lib/marketing-service';
import './site-footer.css';

type InternalItem = { key: string; href: string };
type ExternalItem = { key: string; entry: 'propertyInvestmentPlan' | 'discoveryCall' };

const SELLER_LINKS: InternalItem[] = [
  { key: 'valutazioneGratuita', href: '/valutazione-gratuita' },
  { key: 'add', href: '/add' },
  { key: 'photo', href: '/pricing' },
  { key: 'ape', href: '/pricing' },
  { key: 'documents', href: '/pricing' },
  { key: 'compliance', href: '/pricing' },
  { key: 'rentContract', href: '/pricing' },
];

const BUYER_LINKS: InternalItem[] = [
  { key: 'search', href: '/search' },
  { key: 'viewings', href: '/viewings' },
  { key: 'verify', href: '/pricing' },
  { key: 'proposal', href: '/pricing' },
  { key: 'deed', href: '/pricing' },
  { key: 'buyAbroad', href: '/acquisto-assistito' },
];

const FINANCE_LINKS: ExternalItem[] = [
  { key: 'propertyInvestmentPlan', entry: 'propertyInvestmentPlan' },
  { key: 'verifiedBuyerBadge', entry: 'propertyInvestmentPlan' },
  { key: 'discoveryCall', entry: 'discoveryCall' },
];

const FINANCE_INTERNAL: InternalItem[] = [{ key: 'transparency', href: '/trasparenza' }];

export function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const pathname = usePathname();

  if (isListingLandingPath(pathname) || isMarketingServicePath(pathname)) return null;

  const externalHint = t('externalHint', { host: 'banks4all.eu' });

  return (
    <footer className="sf">
      <div className="sf-wrap">
        <div className="sf-dir">
          <div className="sf-about">
            <Link href="/" className="sf-logo" aria-label="EasyCasa">
              Easy<span>Casa</span>
            </Link>
            <p className="sf-blurb">{t('blurb')}</p>
            <h2 id="footer-about">{t('columns.about')}</h2>
            <p className="sf-about-ext">{t('about')}</p>
            <p className="sf-about-link">
              <Link href="/agenzie">{t('agencies')}</Link>
            </p>
          </div>

          <nav aria-labelledby="footer-sellers">
            <h2 id="footer-sellers">{t('columns.sellers')}</h2>
            <ul>
              {SELLER_LINKS.map((item) => (
                <li key={item.key}>
                  <Link href={item.href}>{t(`sellers.${item.key}`)}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-buyers">
            <h2 id="footer-buyers">{t('columns.buyers')}</h2>
            <ul>
              {BUYER_LINKS.map((item) => (
                <li key={item.key}>
                  <Link href={item.href}>{t(`buyers.${item.key}`)}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-financing">
            <h2 id="footer-financing">{t('columns.financing')}</h2>
            <ul>
              {FINANCE_LINKS.map((item) => {
                const href = getBanks4AllReferralUrl(locale, item.entry);
                const label = t(`financing.${item.key}`);
                return (
                  <li key={item.key}>
                    <a
                      className="sf-ext"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label} — ${externalHint}`}
                    >
                      {label}
                    </a>
                  </li>
                );
              })}
              {FINANCE_INTERNAL.map((item) => (
                <li key={item.key}>
                  <Link href={item.href}>{t(`financing.${item.key}`)}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="sf-legal">
          <p className="sf-entity">{t('entity')}</p>
          <div className="sf-legal-links">
            <Link href="/agenzie">{t('legal.agencies')}</Link>
            <Link href="/legal/privacy">{t('legal.privacy')}</Link>
            <Link href="/legal/terms">{t('legal.terms')}</Link>
            <Link href="/legal/mediation">{t('legal.mediation')}</Link>
            <Link href="/trasparenza">{t('legal.transparency')}</Link>
            <Link href="/privacy">{t('legal.myData')}</Link>
            <Link href="/contatti">{t('legal.contacts')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
