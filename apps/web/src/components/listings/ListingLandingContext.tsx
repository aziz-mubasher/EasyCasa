'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type ListingLandingChrome = {
  listingId: string;
  listingTitle: string;
  pageUrl: string;
};

const ListingLandingContext = createContext<ListingLandingChrome | null>(null);

export function ListingLandingProvider({
  value,
  children,
}: {
  value: ListingLandingChrome;
  children: ReactNode;
}) {
  return (
    <ListingLandingContext.Provider value={value}>{children}</ListingLandingContext.Provider>
  );
}

export function useListingLanding(): ListingLandingChrome | null {
  return useContext(ListingLandingContext);
}
