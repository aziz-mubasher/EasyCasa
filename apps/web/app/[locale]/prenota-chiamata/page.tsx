import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { parseCallBookingLocale } from '@easycasa/shared';
import { BookCallForm } from '@/components/call-booking/BookCallForm';
import { routing } from '@/i18n/routing';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    provincia?: string | string[];
    province?: string | string[];
    motivo?: string | string[];
    reason?: string | string[];
  }>;
};

function first(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'bookCall' });
  return {
    title: { absolute: t('meta.title') },
    description: t('meta.description'),
    robots: { index: false, follow: true },
  };
}

export default async function PrenotaChiamataPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  return (
    <BookCallForm
      locale={parseCallBookingLocale(locale)}
      initialProvince={first(sp.provincia) ?? first(sp.province)}
      initialReason={first(sp.motivo) ?? first(sp.reason)}
    />
  );
}
