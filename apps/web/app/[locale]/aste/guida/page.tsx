import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { AsteGuidaPage } from '@/components/services/AsteGuidaPage';
import { routing } from '@/i18n/routing';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'asteGuida' });
  return {
    title: { absolute: t('meta.title') },
    description: t('meta.description'),
    robots: { index: false, follow: false },
  };
}

async function validateToken(token: string): Promise<boolean> {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';
  try {
    const res = await fetch(`${base}/aste/guide/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function AsteGuidaRoute({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const raw = sp.t;
  const token = Array.isArray(raw) ? raw[0] : raw;

  if (!token || token.trim().length < 16) {
    redirect({ href: '/aste', locale });
  }

  const ok = await validateToken(token!.trim());
  if (!ok) {
    redirect({ href: '/aste', locale });
  }

  return <AsteGuidaPage />;
}
