import type { Metadata } from 'next';
import { CALL_BOOKING_UI } from '@easycasa/shared';
import { DeskCallBooking } from './DeskCallBooking';

type DeskLocale = keyof typeof CALL_BOOKING_UI;

type Search = {
  provincia?: string | string[];
  province?: string | string[];
  motivo?: string | string[];
  reason?: string | string[];
};

function first(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function deskCallMetadata(locale: DeskLocale): Metadata {
  const copy = CALL_BOOKING_UI[locale];
  return {
    title: { absolute: copy.meta.title },
    description: copy.meta.description,
    robots: { index: false, follow: true },
  };
}

export function DeskCallPage({ locale, searchParams }: { locale: DeskLocale; searchParams: Search }) {
  return (
    <DeskCallBooking
      locale={locale}
      initialProvince={first(searchParams.provincia) ?? first(searchParams.province)}
      initialReason={first(searchParams.motivo) ?? first(searchParams.reason)}
    />
  );
}
