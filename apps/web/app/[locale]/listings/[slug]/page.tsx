import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getListing } from '@/lib/api';
import { parseListingDetail, listingShowsSale } from '@/lib/listing-detail';
import { ListingStructuredData } from '@/components/StructuredData';
import { ListingLandingShell } from '@/components/listings/ListingLandingShell';
import { ListingCompGallery } from '@/components/listings/ListingCompGallery';
import { ListingScheda, ListingPriceBlock } from '@/components/listings/ListingScheda';
import { ListingAsidePanel } from '@/components/listings/ListingAsidePanel';
import { ListingOmiSection } from '@/components/listings/ListingOmiSection';
import { AffordThisHomeReferralBlock } from '@/components/financing/AffordThisHomeReferralBlock';
import { MapView } from '@/components/search/MapView';
import { formatProvinceName } from '@/lib/province-display';
import type { ListingSummary } from '@easycasa/shared';
import '@/components/listings/listing-detail.css';

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const raw = await getListing(slug);
  if (!raw) notFound();

  const listing = parseListingDetail(raw, slug);
  const t = await getTranslations('listingDetail');

  const provinceName = formatProvinceName(listing.province);
  const locationLine = [listing.city, provinceName].filter(Boolean).join(' · ');
  const whereLine = [listing.address, locationLine].filter(Boolean).join(' · ');
  const crumb = [listing.city, listing.address?.split(',')[0] ?? provinceName]
    .filter(Boolean)
    .join(' › ');

  const hasLocation = listing.latitude != null && listing.longitude != null;
  const hasDescription = Boolean(listing.description);
  const pagePath = `/${locale}/listings/${listing.slug}`;
  const showFinancingReferral = listingShowsSale(
    listing.transactionTypes,
    listing.transactionType,
  );

  const mapItem: ListingSummary | null = hasLocation
    ? {
        id: listing.id,
        slug: listing.slug,
        title: listing.title,
        price: listing.price,
        currency: listing.currency,
        transactionType: listing.transactionType,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        sizeSqm: listing.sizeSqm,
        city: listing.city,
        latitude: listing.latitude,
        longitude: listing.longitude,
        status: listing.status as ListingSummary['status'],
        coverUrl: listing.photoUrls[0] ?? null,
      }
    : null;

  const sections = [
    { id: 'details', label: t('tabs.details') },
    ...(hasDescription ? [{ id: 'description', label: t('tabs.description') }] : []),
    { id: 'valuation', label: t('tabs.valuation') },
    ...(hasLocation ? [{ id: 'location', label: t('tabs.location') }] : []),
    { id: 'contact', label: t('tabs.contact') },
  ];

  return (
    <div className="ld bg-paper min-h-full">
      <ListingStructuredData
        locale={locale}
        listing={{
          slug: listing.slug,
          title: listing.title,
          description: listing.description ?? undefined,
          price: listing.price ?? undefined,
          currency: listing.currency,
          city: listing.city ?? undefined,
          sizeSqm: listing.sizeSqm ?? undefined,
          bedrooms: listing.bedrooms ?? undefined,
          bathrooms: listing.bathrooms ?? undefined,
          latitude: listing.latitude ?? undefined,
          longitude: listing.longitude ?? undefined,
        }}
      />

      <ListingLandingShell
        chrome={{
          listingId: listing.id,
          listingTitle: listing.title,
          pageUrl: pagePath,
        }}
        tablistLabel={t('tabs.tablist')}
        sections={sections}
      >
        <div className="ld-wrap">
          {crumb ? <p className="ld-crumb">{crumb}</p> : null}

          <ListingCompGallery title={listing.title} urls={listing.photoUrls} />

          <div className="ld-cols">
            <main id="details" className="scroll-mt-28 min-w-0">
              <h1 className="ld-title">{listing.title}</h1>
              {whereLine ? <p className="ld-where">{whereLine}</p> : null}

              <ListingPriceBlock listing={listing} locale={locale} />

              <ListingScheda listing={listing} locale={locale} />

              {hasDescription ? (
                <div id="description" className="ld-desc scroll-mt-28">
                  <h3>{t('tabs.description')}</h3>
                  <p>{listing.description}</p>
                </div>
              ) : null}

              <div id="valuation" className="scroll-mt-28">
                <ListingOmiSection slug={listing.slug} />
              </div>

              {showFinancingReferral ? (
                <div className="mt-8">
                  <AffordThisHomeReferralBlock />
                </div>
              ) : null}

              {hasLocation && mapItem ? (
                <div id="location" className="ld-map scroll-mt-28">
                  <div className="ld-map-inner">
                    <MapView items={[mapItem]} showNavigation={false} />
                  </div>
                  <p className="ld-map-cap">{t('map.approxCaption')}</p>
                </div>
              ) : null}

              <div id="contact" className="scroll-mt-28 sr-only" aria-hidden>
                {t('tabs.contact')}
              </div>
            </main>

            <ListingAsidePanel
              listingId={listing.id}
              listingSlug={listing.slug}
              listingTitle={listing.title}
              sellerType={listing.sellerType}
              agentName={listing.agent?.displayName ?? null}
            />
          </div>
        </div>
      </ListingLandingShell>
    </div>
  );
}
