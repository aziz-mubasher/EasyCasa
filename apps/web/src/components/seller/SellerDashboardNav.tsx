'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { Link, usePathname } from '@/i18n/routing';
import { isSellerInboxDisabled } from '@/lib/seller-inbox';

import './seller-inbox.css';

type NavItem = {
  key: 'list' | 'inbox' | 'viewings';
  href: string;
  gated?: boolean;
};

const NAV: NavItem[] = [
  { key: 'list', href: '/seller/list' },
  { key: 'inbox', href: '/seller/inbox', gated: true },
  { key: 'viewings', href: '/seller/viewings' },
];

/** EC-S-T20 — seller dashboard shell nav; inbox link hidden when API flag is off. */
export function SellerDashboardNav() {
  const t = useTranslations('sellerDashboard');
  const pathname = usePathname();
  const { ready, isAuthenticated, getAccessToken } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const [inboxEnabled, setInboxEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ready || !isAuthenticated) {
      setInboxEnabled(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await authedFetch(apiUrl('/seller/enquiries'), {
          headers: { Accept: 'application/json' },
        });
        if (!cancelled) setInboxEnabled(!isSellerInboxDisabled(res.status));
      } catch {
        if (!cancelled) setInboxEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, isAuthenticated, authedFetch]);

  const items = NAV.filter((item) => !item.gated || inboxEnabled === true);

  if (!ready || !isAuthenticated || items.length === 0) return null;

  return (
    <nav className="mx-auto max-w-3xl px-5 pt-6" aria-label={t('navLabel')}>
      <ul className="flex flex-wrap gap-2 border-b border-line pb-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-sm no-underline ${
                  active
                    ? 'bg-azure text-white'
                    : 'bg-wash text-ink hover:bg-line/40'
                }`}
              >
                {t(`nav.${item.key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
