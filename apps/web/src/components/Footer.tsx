'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { getBanks4AllReferralUrl } from '@/lib/banks4all-referral';
import { isListingLandingPath } from '@/lib/listing-landing';
import { isMarketingServicePath } from '@/lib/marketing-service';
import { sellPrivatelyPath } from '@/lib/sell-privately';
import { MundidaDevCredit } from '@/components/MundidaDevCredit';
import './site-footer.css';

type InternalItem = { key: string; href: string };

/** Easy Legenda — sister product (production host). */
const LEGENDA_ORIGIN = 'https://legenda.easycasaita.com' as const;

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

type StakeholderInternal = { key: string; kind: 'internal'; href: string };
type StakeholderExternal = { key: string; kind: 'external'; href: string; host: string };

export function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const pathname = usePathname();
  const sellerLinks: InternalItem[] = [
    { key: 'sellPrivately', href: sellPrivatelyPath(locale) },
    ...SELLER_LINKS_REST,
  ];

  const nibHref = getBanks4AllReferralUrl(locale, 'nibProperty');
  const stakeholderLinks: Array<StakeholderInternal | StakeholderExternal> = [
    { key: 'banks4all', kind: 'internal', href: '/banks4all' },
    { key: 'easyLegenda', kind: 'external', href: LEGENDA_ORIGIN, host: 'legenda.easycasaita.com' },
    { key: 'nibProperty', kind: 'external', href: nibHref, host: 'banks4all.eu' },
    { key: 'agencies', kind: 'internal', href: '/agenzie' },
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
              {stakeholderLinks.map((item) => (
                <li key={item.key}>
                  {item.kind === 'external' ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${t(`stakeholders.${item.key}`)} — ${t('externalHint', { host: item.host })}`}
                    >
                      {t(`stakeholders.${item.key}`)}
                    </a>
                  ) : (
                    <Link href={item.href}>{t(`stakeholders.${item.key}`)}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="sf-legal">
          <div className="sf-legal-meta">
            <p className="sf-entity">
              {t('entity')}
              <MundidaDevCredit className="sf-dev-credit" inline leadingMiddot />
            </p>
          </div>
          <div className="sf-legal-links">
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
