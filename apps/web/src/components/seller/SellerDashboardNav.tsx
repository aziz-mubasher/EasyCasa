'use client';

import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/routing';
import { sellerInboxEnabled } from '@/lib/seller-inbox-config';

import './seller-inbox.css';

type NavItem = {
  key: 'list' | 'listings' | 'inbox' | 'viewings';
  href: string;
  /** When true, omit unless NEXT_PUBLIC_SELLER_INBOX_ENABLED is on. */
  inboxGated?: boolean;
};

const NAV: NavItem[] = [
  { key: 'list', href: '/seller/list' },
  { key: 'listings', href: '/seller/listings' },
  { key: 'inbox', href: '/seller/enquiries', inboxGated: true },
  { key: 'viewings', href: '/seller/viewings' },
];

/**
 * EC-S-T20 / K EC 1.45 — seller dashboard shell nav.
 * Inbox link points at `/seller/enquiries` and is hidden while the dark web flag is off.
 */
export function SellerDashboardNav() {
  const t = useTranslations('sellerDashboard');
  const pathname = usePathname();
  const showInbox = sellerInboxEnabled();

  const items = NAV.filter((item) => !item.inboxGated || showInbox);

  return (
    <nav className="seller-dash-nav" aria-label={t('navLabel')} data-testid="seller-dashboard-nav">
      <ul>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.key}>
              <Link href={item.href} aria-current={active ? 'page' : undefined}>
                {t(`nav.${item.key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
