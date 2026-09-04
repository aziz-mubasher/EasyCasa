import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { AsteReportPage } from '@/components/services/AsteReportPage';
import { asteAnalysisRouteAllowed } from '@/lib/aste-access-server';

type Props = { params: Promise<{ locale: string; id: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'asteReport' });
  return {
    title: { absolute: t('meta.title') },
    description: t('meta.description'),
    robots: { index: false, follow: false },
  };
}

export default async function AsteReportRoute({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!(await asteAnalysisRouteAllowed())) {
    redirect({ href: '/aste', locale });
  }
  return <AsteReportPage analysisId={id} />;
}
