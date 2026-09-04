import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AddListingForm } from '@/components/add/AddListingForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('add.title'),
    description: t('add.description'),
    alternates: { canonical: `/${locale}/add` },
  };
}

export default function AddListingPage() {
  return <AddListingForm />;
}
