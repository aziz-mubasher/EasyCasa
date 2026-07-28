import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { BookViewingPicker } from '@/components/viewings/BookViewingPicker';
import { Link } from '@/i18n/routing';
import { getListing } from '@/lib/api';
import { parseListingDetail } from '@/lib/listing-detail';
import { formatProvinceName } from '@/lib/province-display';

export default async function BookViewingPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const raw = await getListing(slug);
  if (!raw) notFound();

  const listing = parseListingDetail(raw, slug);
  const t = await getTranslations('viewings');
  const provinceName = formatProvinceName(listing.province);
  const areaLabel = [listing.city, provinceName].filter(Boolean).join(', ') || null;

  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <p className="mb-6">
        <Link
          href={`/listings/${listing.slug}`}
          className="text-sm text-azure underline hover:no-underline"
        >
          {t('backToListing')}
        </Link>
      </p>
      <BookViewingPicker
        listingId={listing.id}
        listingSlug={listing.slug}
        listingTitle={listing.title}
        areaLabel={areaLabel}
      />
    </section>
  );
}
