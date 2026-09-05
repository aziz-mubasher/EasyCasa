'use client';

import { NextIntlClientProvider } from 'next-intl';
import { CALL_BOOKING_UI, type CallBookingLocale } from '@easycasa/shared';
import { BookCallForm } from './BookCallForm';

type DeskLocale = keyof typeof CALL_BOOKING_UI;

export function DeskCallBooking({
  locale,
  initialProvince,
  initialReason,
}: {
  locale: DeskLocale;
  initialProvince?: string | null;
  initialReason?: string | null;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={{ bookCall: CALL_BOOKING_UI[locale] }}>
      <BookCallForm
        locale={locale as CallBookingLocale}
        initialProvince={initialProvince}
        initialReason={initialReason}
      />
    </NextIntlClientProvider>
  );
}
