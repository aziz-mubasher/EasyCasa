'use client';

import { useEffect } from 'react';

import { PRODUCT_EVENTS, trackProduct } from '@/lib/product-analytics';

/** Client listing view — bots and the server render do not fire this. */
export function ListingViewBeacon({
  locale,
  provincia,
}: {
  locale: string;
  provincia?: string | null;
}) {
  useEffect(() => {
    const props: Record<string, string> = {};
    if (locale === 'it' || locale === 'en' || locale === 'es') props.locale = locale;
    if (provincia && /^[A-Za-z]{2}$/.test(provincia)) props.provincia = provincia;
    trackProduct(PRODUCT_EVENTS.LISTING_VIEW, props);
  }, [locale, provincia]);
  return null;
}
