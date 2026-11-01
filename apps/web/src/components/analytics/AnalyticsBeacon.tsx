'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { armAddListing, bindClicks, bindEngage, sendPageview } from '@/lib/analytics/beacon';

function Tracker() {
  const pathname = usePathname() ?? '/';
  const search = useSearchParams();
  const query = search?.toString() ?? '';

  useEffect(() => {
    sendPageview(pathname, query);
    armAddListing(pathname);
    return bindEngage(pathname);
  }, [pathname, query]);

  useEffect(() => {
    bindClicks();
  }, []);

  return null;
}

/** Mounted once per locale layout. Renders nothing. */
export function AnalyticsBeacon() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
