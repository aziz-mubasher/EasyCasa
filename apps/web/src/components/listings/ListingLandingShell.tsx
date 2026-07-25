'use client';

import type { ReactNode } from 'react';
import { ListingLandingNav } from '@/components/listings/ListingLandingNav';
import {
  ListingLandingProvider,
  type ListingLandingChrome,
} from '@/components/listings/ListingLandingContext';

type Section = { id: string; label: string };

/** Listing landing: header share context + sticky section nav (public — no login). */
export function ListingLandingShell({
  chrome,
  tablistLabel,
  sections,
  children,
}: {
  chrome: ListingLandingChrome;
  tablistLabel: string;
  sections: Section[];
  children: ReactNode;
}) {
  return (
    <ListingLandingProvider value={chrome}>
      <ListingLandingNav tablistLabel={tablistLabel} sections={sections} />
      {children}
    </ListingLandingProvider>
  );
}
