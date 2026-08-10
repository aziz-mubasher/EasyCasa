import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { AsteAnalisiPage } from '@/components/services/AsteAnalisiPage';
import { asteAnalysisEnabled } from '@/lib/aste-analysis-config';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'asteAnalisi' });
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    robots: { index: false, follow: false },
  };
}

export default async function AsteAnalisiRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!asteAnalysisEnabled()) {
    redirect({ href: '/aste', locale });
  }
  return <AsteAnalisiPage />;
}
