'use client';

import type { ReactNode } from 'react';
import { useIsAdmin } from '@/auth/useIsAdmin';
import { ListingLandingNav } from '@/components/listings/ListingLandingNav';
import {
  ListingLandingProvider,
  type ListingLandingChrome,
} from '@/components/listings/ListingLandingContext';

type Section = { id: string; label: string };

/** Listing landing: header share context + sticky nav (valuation tab admin-only). */
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
  const { ready, isAdmin } = useIsAdmin();
  const showValuation = ready && isAdmin;
  const navSections = sections.filter((s) => s.id !== 'valuation' || showValuation);

  return (
    <ListingLandingProvider value={chrome}>
      <ListingLandingNav tablistLabel={tablistLabel} sections={navSections} />
      {children}
    </ListingLandingProvider>
  );
}
