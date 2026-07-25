import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getListing } from '@/lib/api';
import { parseListingDetail } from '@/lib/listing-detail';
import { ListingStructuredData } from '@/components/StructuredData';
import { SmartLinkManager } from '@/components/smartlink/SmartLinkManager';
import { ListingValuationBandSection } from '@/components/valuation/ListingValuationBandSection';
import { ListingPhotoGallery } from '@/components/listings/ListingPhotoGallery';
import { ListingLandingShell } from '@/components/listings/ListingLandingShell';
import { ListingSummaryCard } from '@/components/listings/ListingSummaryCard';
import { ListingFactsTable } from '@/components/listings/ListingFactsTable';
import { AdminOnly } from '@/components/auth/AdminOnly';
import { MapView } from '@/components/search/MapView';
import type { ListingSummary } from '@easycasa/shared';

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

  const locationLine = [listing.city, listing.province].filter(Boolean).join(' · ');
  const hasCatasto = Boolean(listing.foglio && listing.particella);
  const hasLocation = listing.latitude != null && listing.longitude != null;
  const hasDescription = Boolean(listing.description);
  const pagePath = `/${locale}/listings/${listing.slug}`;
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
  ];

  return (
    <div className="bg-sand/30 min-h-full">
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
        <article className="mx-auto max-w-6xl px-5 py-8 space-y-14 pb-16">
          <section id="details" className="scroll-mt-28 space-y-10">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] lg:items-start">
              <div className="min-w-0">
                <ListingPhotoGallery title={listing.title} urls={listing.photoUrls} />
              </div>
              <ListingSummaryCard listing={listing} locale={locale} />
            </div>

            <div className="max-w-3xl">
              <h2 className="font-display text-lg font-semibold text-ink mb-3">{t('factsHeading')}</h2>
              <div className="rounded-xl2 border border-line bg-paper p-4">
                <ListingFactsTable listing={listing} locale={locale} />
              </div>
            </div>

            {hasCatasto ? (
              <div>
                <h2 className="font-display text-lg font-semibold text-ink mb-3">{t('catastoHeading')}</h2>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 data text-sm rounded-xl2 border border-line bg-paper p-4 max-w-xl">
                  <div>
                    <dt className="eyebrow">{t('catasto.foglio')}</dt>
                    <dd>{listing.foglio}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">{t('catasto.particella')}</dt>
                    <dd>{listing.particella}</dd>
                  </div>
                  {listing.subalterno ? (
                    <div>
                      <dt className="eyebrow">{t('catasto.subalterno')}</dt>
                      <dd>{listing.subalterno}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}
          </section>

          {hasDescription ? (
            <section id="description" className="scroll-mt-28 max-w-3xl">
              <h2 className="font-display text-2xl font-semibold text-ink mb-2">{t('tabs.description')}</h2>
              <p className="text-sm text-muted mb-5">{t('descriptionIntro')}</p>
              <div className="rounded-xl2 border border-line bg-paper p-5 sm:p-6">
                <p className="leading-relaxed whitespace-pre-line text-ink text-base">
                  {listing.description}
                </p>
              </div>
            </section>
          ) : null}

          <AdminOnly>
            <section id="valuation" className="scroll-mt-28 space-y-4 max-w-3xl">
              <h2 className="font-display text-2xl font-semibold text-ink">{t('tabs.valuation')}</h2>
              <p className="text-sm text-muted">{t('valuationIntro')}</p>
              <ListingValuationBandSection slug={listing.slug} />
            </section>
          </AdminOnly>

          <section
            id="listing-smartlink"
            className="scroll-mt-28 max-w-3xl border-t border-line pt-10"
            aria-labelledby="listing-smartlink-heading"
          >
            <h2 id="listing-smartlink-heading" className="font-display text-xl font-semibold text-ink mb-2">
              {t('shareHeading')}
            </h2>
            <p className="text-sm text-muted mb-4">{t('share.landingBody')}</p>
            <SmartLinkManager listingId={listing.id} hideIntro />
          </section>

          {hasLocation && mapItem ? (
            <section id="location" className="scroll-mt-28 space-y-4">
              <h2 className="font-display text-2xl font-semibold text-ink">{t('tabs.location')}</h2>
              {listing.address || locationLine ? (
                <p className="text-sm text-muted">
                  {[listing.address, locationLine].filter(Boolean).join(' · ')}
                </p>
              ) : null}
              <div className="h-[420px] rounded-xl2 overflow-hidden border border-line bg-paper">
                <MapView items={[mapItem]} showNavigation />
              </div>
            </section>
          ) : null}
        </article>
      </ListingLandingShell>
    </div>
  );
}
