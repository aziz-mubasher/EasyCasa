import { getTranslations } from 'next-intl/server';

import { EditListingAvailability } from '@/components/viewings/EditListingAvailability';

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async function ListingAvailabilityPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations('availability');

  return (
    <section className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl font-semibold mb-2">{t('editTitle')}</h1>
      <p className="text-sm text-muted mb-8">{t('editSubtitle')}</p>
      <EditListingAvailability listingId={slug} />
    </section>
  );
}
