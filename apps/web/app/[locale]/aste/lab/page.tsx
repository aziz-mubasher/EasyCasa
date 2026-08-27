import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect } from 'next/navigation';
import { redirect } from '@/i18n/routing';
import { AsteLabPage } from '@/components/services/AsteLabPage';
import { getAsteLabGateState } from '@/lib/aste-access-server';
import { asteAnalysisRouteMounted } from '@/lib/aste-analysis-config';

type Props = { params: Promise<{ locale: string }> };

/** Internal lab — request-time flags + cookie; never SSG. */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'asteLab' });
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    robots: { index: false, follow: false },
  };
}

/**
 * EC-36 testing entry UI (SOP Lanes C + D).
 * Visible when preview or public build arg is on; shows soft diagnostics if
 * the session is not allowlisted (unlike /aste/analisi which hard-redirects).
 */
export default async function AsteLabRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const labOrigin = (process.env.NEXT_PUBLIC_LEGENDA_LAB_ORIGIN ?? '').replace(/\/$/, '');
  if (labOrigin) {
    nextRedirect(`${labOrigin}/${locale}/aste/lab`);
  }

  if (!asteAnalysisRouteMounted()) {
    redirect({ href: '/aste', locale });
  }

  const gate = await getAsteLabGateState();
  return <AsteLabPage gate={gate} />;
}
