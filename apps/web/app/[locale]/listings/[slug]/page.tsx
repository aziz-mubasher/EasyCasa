import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getListing } from '@/lib/api';
import { parseListingDetail } from '@/lib/listing-detail';
import { ListingStructuredData } from '@/components/StructuredData';
import { ContactEnquiryForm } from '@/components/listings/ContactEnquiryForm';
import { SmartLinkManager } from '@/components/smartlink/SmartLinkManager';
import { ListingValuationBandSection } from '@/components/valuation/ListingValuationBandSection';
import { ListingPhotoGallery } from '@/components/listings/ListingPhotoGallery';
import { ListingDetailTabs } from '@/components/listings/ListingDetailTabs';
import { EnergyClassBadge } from '@/components/listings/EnergyClassBadge';
import { ListingFactsTable, ListingPriceLines } from '@/components/listings/ListingFactsTable';
import { MapView } from '@/components/search/MapView';
import type { ListingSummary } from '@easycasa/shared';
import { Badge } from '@/components/ui/Badge';

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
  const tf = await getTranslations('search.filters');

  const locationLine = [listing.city, listing.province].filter(Boolean).join(' · ');
  const hasCatasto = Boolean(listing.foglio && listing.particella);
  const hasLocation = listing.latitude != null && listing.longitude != null;
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

  const rentPrimary = listing.transactionType === 'rent';

  return (
    <article className="mx-auto max-w-6xl px-5 py-8 lg:py-10">
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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <ListingPhotoGallery title={listing.title} urls={listing.photoUrls} />

          <header className="lg:hidden">
            <p className="eyebrow mb-2">{locationLine}</p>
            <h1 className="font-display text-3xl font-semibold text-ink">{listing.title}</h1>
            <div className="mt-3">
              <ListingPriceLines listing={listing} locale={locale} />
            </div>
          </header>
        </div>

        <aside className="lg:sticky lg:top-20 space-y-6 rounded-xl2 border border-line bg-paper p-5 shadow-sm">
          <div className="hidden lg:block">
            <p className="eyebrow mb-2">{locationLine}</p>
            <h1 className="font-display text-2xl font-semibold text-ink leading-snug">{listing.title}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {rentPrimary ? (
                <Badge tone="pine">{tf('transaction.rent')}</Badge>
              ) : (
                <Badge tone="ink">{tf('transaction.sale')}</Badge>
              )}
            </div>
            <div className="mt-4">
              <ListingPriceLines listing={listing} locale={locale} />
            </div>
          </div>

          <section aria-labelledby="listing-sidebar-facts">
            <h2 id="listing-sidebar-facts" className="eyebrow mb-3">
              {t('factsHeading')}
            </h2>
            <ListingFactsTable listing={listing} locale={locale} />
          </section>

          {listing.energyClass ? (
            <EnergyClassBadge
              energyClass={listing.energyClass}
              performanceKwh={listing.energyPerformanceKwhM2Y}
              label={t('energyHeading')}
              performanceLabel={
                listing.energyPerformanceKwhM2Y != null
                  ? t('facts.energyPerformanceValue', { value: listing.energyPerformanceKwhM2Y })
                  : ''
              }
            />
          ) : null}

          <ContactEnquiryForm listingId={listing.id} listingTitle={listing.title} className="!mt-0 max-w-none" />
        </aside>
      </div>

      <ListingDetailTabs
        tablistLabel={t('tabs.tablist')}
        labels={{
          details: t('tabs.details'),
          description: t('tabs.description'),
          location: t('tabs.location'),
          valuation: t('tabs.valuation'),
        }}
        hasDescription={Boolean(listing.description)}
        hasLocation={hasLocation}
        details={
          <div className="space-y-8 max-w-3xl">
            {listing.features.length > 0 ? (
              <section aria-labelledby="listing-features">
                <h2 id="listing-features" className="eyebrow mb-3">
                  {t('characteristics')}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {listing.features.map((featureSlug) => {
                    const key = featureSlug as 'garden';
                    const label = tf.has(`feature.${key}`) ? tf(`feature.${key}`) : featureSlug;
                    return (
                      <li key={featureSlug}>
                        <span className="inline-flex rounded-full border border-line bg-sand px-3 py-1 text-xs text-ink">
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {hasCatasto ? (
              <section aria-labelledby="listing-catasto">
                <h2 id="listing-catasto" className="eyebrow mb-3">
                  {t('catastoHeading')}
                </h2>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 data text-sm">
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
              </section>
            ) : null}

            <section aria-labelledby="listing-facts-full">
              <h2 id="listing-facts-full" className="eyebrow mb-3">
                {t('factsHeading')}
              </h2>
              <ListingFactsTable listing={listing} locale={locale} />
            </section>
          </div>
        }
        description={
          listing.description ? (
            <div className="max-w-3xl">
              <p className="leading-relaxed whitespace-pre-line text-ink">{listing.description}</p>
            </div>
          ) : null
        }
        location={
          hasLocation && mapItem ? (
            <div className="space-y-4">
              {listing.address ? (
                <p className="text-sm text-muted">
                  {listing.address}
                  {locationLine ? ` · ${locationLine}` : ''}
                </p>
              ) : null}
              <div className="h-[360px]">
                <MapView items={[mapItem]} showNavigation />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">{t('locationUnavailable')}</p>
          )
        }
        valuation={<ListingValuationBandSection slug={listing.slug} />}
      />

      <section className="mt-10 max-w-3xl border-t border-line pt-8" aria-labelledby="listing-smartlink">
        <h2 id="listing-smartlink" className="font-display text-xl font-semibold text-ink mb-4">
          {t('shareHeading')}
        </h2>
        <SmartLinkManager listingId={listing.id} />
      </section>
    </article>
  );
}
