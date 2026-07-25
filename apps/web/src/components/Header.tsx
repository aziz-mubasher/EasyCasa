'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { LocaleSwitcher } from './LocaleSwitcher';
import { AuthControls } from './AuthControls';
import { isListingLandingPath } from '@/lib/listing-landing';
import { useListingLanding } from '@/components/listings/ListingLandingContext';
import { ListingShareActions } from '@/components/listings/ListingShareActions';

export function Header() {
  const t = useTranslations('nav');
  const tb = useTranslations('brand');
  const pathname = usePathname();
  const landing = isListingLandingPath(pathname);
  const listing = useListingLanding();

  if (landing) {
    return (
      <header className="border-b border-line bg-paper sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight shrink-0">
            {tb('name')}
            <span className="text-azure">.</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {listing ? (
              <ListingShareActions
                pageUrl={listing.pageUrl}
                listingId={listing.listingId}
                listingTitle={listing.listingTitle}
                compact
              />
            ) : null}
            <LocaleSwitcher />
            <AuthControls />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-line bg-paper/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          {tb('name')}
          <span className="text-azure">.</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/search" className="hover:text-azure">
            {t('search')}
          </Link>
          <Link href="/pricing" className="hover:text-azure">
            {t('pricing')}
          </Link>
          <Link href="/add" className="hover:text-azure">
            {t('add')}
          </Link>
          <Link href="/favorites" className="hover:text-azure">
            {t('favorites')}
          </Link>
          <AuthControls />
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
