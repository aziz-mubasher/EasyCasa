import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MediazioneView } from '@/components/privacy/MediazioneView';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'mediationPage' });
  return {
    title: { absolute: t('metaTitle') },
    description: t('metaDescription'),
  };
}

export default async function MediationDisclosurePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MediazioneView />;
}
