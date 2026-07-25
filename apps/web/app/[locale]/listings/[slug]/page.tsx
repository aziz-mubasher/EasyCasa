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
import { ListingShareActions } from '@/components/listings/ListingShareActions';
import { MapView } from '@/components/search/MapView';
import type { ListingSummary } from '@easycasa/shared';
import { Badge } from '@/components/ui/Badge';
import { area } from '@/lib/format';

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

  const rentPrimary = listing.transactionType === 'rent';
  const showSale = listing.transactionTypes.includes('sale') || listing.transactionType === 'sale';
  const showRent = listing.transactionTypes.includes('rent') || listing.transactionType === 'rent';

  const energyPerformanceLabel =
    listing.energyPerformanceKwhM2Y != null
      ? t('facts.energyPerformanceValue', { value: listing.energyPerformanceKwhM2Y })
      : '';

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

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-1">{locationLine || '—'}</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight max-w-3xl">
            {listing.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {showSale ? <Badge tone="ink">{tf('transaction.sale')}</Badge> : null}
            {showRent ? <Badge tone="pine">{tf('transaction.rent')}</Badge> : null}
            {!showSale && !showRent && rentPrimary ? (
              <Badge tone="pine">{tf('transaction.rent')}</Badge>
            ) : null}
            {!showSale && !showRent && !rentPrimary ? (
              <Badge tone="ink">{tf('transaction.sale')}</Badge>
            ) : null}
          </div>
        </div>
        <ListingShareActions pageUrl={pagePath} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
        <div className="min-w-0">
          <ListingPhotoGallery title={listing.title} urls={listing.photoUrls} />
        </div>

        <aside className="lg:sticky lg:top-20 space-y-5 rounded-xl2 border border-line bg-paper p-5 shadow-sm">
          <div>
            <ListingPriceLines listing={listing} locale={locale} />
          </div>

          <dl className="grid grid-cols-2 gap-3 data text-sm border-y border-line py-4">
            {listing.bedrooms != null ? (
              <div>
                <dt className="eyebrow">{t('facts.bedrooms')}</dt>
                <dd className="text-ink mt-0.5">{listing.bedrooms}</dd>
              </div>
            ) : null}
            {listing.bathrooms != null ? (
              <div>
                <dt className="eyebrow">{t('facts.bathrooms')}</dt>
                <dd className="text-ink mt-0.5">{listing.bathrooms}</dd>
              </div>
            ) : null}
            {listing.sizeSqm != null ? (
              <div>
                <dt className="eyebrow">{t('facts.builtSurface')}</dt>
                <dd className="text-ink mt-0.5">{area(listing.sizeSqm)}</dd>
              </div>
            ) : null}
            {listing.yearBuilt != null ? (
              <div>
                <dt className="eyebrow">{t('facts.yearBuilt')}</dt>
                <dd className="text-ink mt-0.5">{listing.yearBuilt}</dd>
              </div>
            ) : null}
          </dl>

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
          <div className="space-y-10 max-w-3xl">
            {listing.features.length > 0 ? (
              <section aria-labelledby="listing-features">
                <h2 id="listing-features" className="font-display text-xl font-semibold text-ink mb-4">
                  {t('characteristics')}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {listing.features.map((featureSlug) => {
                    const key = featureSlug as 'garden';
                    const label = tf.has(`feature.${key}`) ? tf(`feature.${key}`) : featureSlug;
                    return (
                      <li key={featureSlug}>
                        <span className="inline-flex rounded-md border border-line bg-sand/60 px-3 py-1.5 text-sm text-ink">
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <section aria-labelledby="listing-facts-full">
              <h2 id="listing-facts-full" className="font-display text-xl font-semibold text-ink mb-4">
                {t('factsHeading')}
              </h2>
              <ListingFactsTable listing={listing} locale={locale} />
            </section>

            {listing.energyClass ? (
              <section aria-labelledby="listing-ape-heading" id="listing-ape" className="scroll-mt-28">
                <h2 id="listing-ape-heading" className="font-display text-xl font-semibold text-ink mb-4">
                  {t('energyHeading')}
                </h2>
                <EnergyClassBadge
                  variant="panel"
                  energyClass={listing.energyClass}
                  performanceKwh={listing.energyPerformanceKwhM2Y}
                  label={t('energyHeading')}
                  performanceLabel={energyPerformanceLabel}
                  note={t('energy.apeNote')}
                />
              </section>
            ) : null}

            {hasCatasto ? (
              <section aria-labelledby="listing-catasto">
                <h2 id="listing-catasto" className="font-display text-xl font-semibold text-ink mb-4">
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
          </div>
        }
        description={
          listing.description ? (
            <div className="max-w-3xl">
              <h2 className="font-display text-xl font-semibold text-ink mb-4">{t('tabs.description')}</h2>
              <p className="leading-relaxed whitespace-pre-line text-ink text-base">
                {listing.description}
              </p>
            </div>
          ) : null
        }
        location={
          hasLocation && mapItem ? (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-ink">{t('tabs.location')}</h2>
              {listing.address ? (
                <p className="text-sm text-muted">
                  {listing.address}
                  {locationLine ? ` · ${locationLine}` : ''}
                </p>
              ) : null}
              <div className="h-[400px] rounded-xl2 overflow-hidden border border-line">
                <MapView items={[mapItem]} showNavigation />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">{t('locationUnavailable')}</p>
          )
        }
        valuation={
          <div className="space-y-8 max-w-3xl">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink mb-2">{t('tabs.valuation')}</h2>
              <p className="text-sm text-muted mb-6">{t('valuationIntro')}</p>
              <ListingValuationBandSection slug={listing.slug} />
            </div>
            <section
              id="listing-smartlink"
              className="scroll-mt-28 border-t border-line pt-8"
              aria-labelledby="listing-smartlink-heading"
            >
              <h2 id="listing-smartlink-heading" className="font-display text-xl font-semibold text-ink mb-2">
                {t('shareHeading')}
              </h2>
              <p className="text-sm text-muted mb-4">{t('share.landingBody')}</p>
              <SmartLinkManager listingId={listing.id} hideIntro />
            </section>
          </div>
        }
      />
    </article>
  );
}
