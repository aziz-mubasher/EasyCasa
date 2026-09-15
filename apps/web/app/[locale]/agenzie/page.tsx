import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AgenziePage } from '@/components/services/AgenziePage';
import { routing } from '@/i18n/routing';
import { agenzieAbsoluteUrl, agenzieLanguageAlternates } from '@/lib/agenzie';

type Props = { params: Promise<{ locale: string }> };

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'agenzie' });
  const canonical = agenzieAbsoluteUrl(locale, SITE);

  return {
    title: { absolute: t('meta.title') },
    description: t('meta.description'),
    alternates: {
      canonical,
      languages: agenzieLanguageAlternates(SITE),
    },
    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      type: 'website',
      url: canonical,
      locale: locale === 'it' ? 'it_IT' : locale === 'es' ? 'es_ES' : 'en_GB',
    },
  };
}

export default async function AgenzieRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AgenziePage />;
}
