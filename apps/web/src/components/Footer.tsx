'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { isListingLandingPath } from '@/lib/listing-landing';
import { isMarketingServicePath } from '@/lib/marketing-service';
import { sellPrivatelyPath } from '@/lib/sell-privately';
import './site-footer.css';

type InternalItem = { key: string; href: string };

const SELLER_LINKS_REST: InternalItem[] = [
  { key: 'valutazioneGratuita', href: '/valutazione-gratuita' },
  { key: 'add', href: '/add' },
  { key: 'photo', href: '/pricing' },
  { key: 'ape', href: '/pricing' },
  { key: 'documents', href: '/pricing' },
  { key: 'compliance', href: '/pricing' },
  { key: 'rentContract', href: '/pricing' },
];

const BUYER_LINKS: InternalItem[] = [
  { key: 'forBuyers', href: '/for-buyers' },
  { key: 'search', href: '/search' },
  { key: 'viewings', href: '/viewings' },
  { key: 'verify', href: '/pricing' },
  { key: 'proposal', href: '/pricing' },
  { key: 'deed', href: '/pricing' },
  { key: 'buyAbroad', href: '/acquisto-assistito' },
];

const STAKEHOLDER_LINKS: InternalItem[] = [
  { key: 'banks4all', href: '/banks4all' },
  { key: 'agencies', href: '/agenzie' },
];

export function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const pathname = usePathname();
  const sellerLinks: InternalItem[] = [
    { key: 'sellPrivately', href: sellPrivatelyPath(locale) },
    ...SELLER_LINKS_REST,
  ];

  if (isListingLandingPath(pathname) || isMarketingServicePath(pathname)) return null;

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
            <p className="sf-about-link">
              <Link href="/about">{t('aboutLink')}</Link>
            </p>
          </div>

          <nav aria-labelledby="footer-sellers">
            <h2 id="footer-sellers">{t('columns.sellers')}</h2>
            <ul>
              {sellerLinks.map((item) => (
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

          <nav aria-labelledby="footer-stakeholders">
            <h2 id="footer-stakeholders">{t('columns.stakeholders')}</h2>
            <ul>
              {STAKEHOLDER_LINKS.map((item) => (
                <li key={item.key}>
                  <Link href={item.href}>{t(`stakeholders.${item.key}`)}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="sf-legal">
          <p className="sf-entity">{t('entity')}</p>
          <div className="sf-legal-links">
            <Link href="/agenzie">{t('legal.agencies')}</Link>
            <Link href="/banks4all">{t('legal.banks4all')}</Link>
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
