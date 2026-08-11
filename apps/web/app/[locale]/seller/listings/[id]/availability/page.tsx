import { getTranslations } from 'next-intl/server';

import { EditListingAvailability } from '@/components/viewings/EditListingAvailability';

type Props = { params: Promise<{ locale: string; id: string }> };

/** EC-S-T21/T22 — seller availability editor (capacity + seller API surface). */
export default async function SellerListingAvailabilityPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations('availability');

  return (
    <section className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl font-semibold mb-2">{t('editTitle')}</h1>
      <p className="text-sm text-muted mb-8">{t('editSubtitle')}</p>
      <EditListingAvailability listingId={id} surface="seller" />
    </section>
  );
}
