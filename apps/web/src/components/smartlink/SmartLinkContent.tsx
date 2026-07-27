import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Link } from '@/i18n/routing';

import { ListingPhotoGallery } from '@/components/listings/ListingPhotoGallery';
import { ListingFactsTable, ListingPriceLines } from '@/components/listings/ListingFactsTable';
import { ValuationBandPanel } from '@/components/valuation/ValuationBandPanel';
import { SmartLinkAgentCard } from '@/components/smartlink/SmartLinkAgentCard';
import { SmartLinkStatsStrip } from '@/components/smartlink/SmartLinkStatsStrip';
import { SmartLinkToolbar } from '@/components/smartlink/SmartLinkToolbar';
import { SmartLinkViewRecorder } from '@/components/smartlink/SmartLinkViewRecorder';
import { fetchSmartLinkPublic, SMARTLINK_VISITOR_COOKIE, smartLinkPublicUrl } from '@/lib/smartlink';
import { smartLinkListingToDetail, smartLinkPhotoUrls } from '@/lib/smartlink-listing';
import { valuationBandEnabled } from '@/lib/valuation-band';
import { formatProvinceName } from '@/lib/province-display';

export async function SmartLinkContent({ token, locale }: { token: string; locale: string }) {
  const t = await getTranslations('smartlink');
  const tf = await getTranslations('search.filters');
  const tDetail = await getTranslations('listingDetail');
  const jar = await cookies();
  const visitor = jar.get(SMARTLINK_VISITOR_COOKIE)?.value ?? null;
  const { data, status } = await fetchSmartLinkPublic(token, visitor);

  if (status === 410) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">{t('revokedTitle')}</h1>
        <p className="mt-3 text-muted">{t('revokedBody')}</p>
      </section>
    );
  }

  if (!data) notFound();

  const listing = data.listing;
  const parsed = smartLinkListingToDetail(listing, token);
  const photoUrls = smartLinkPhotoUrls(listing);
  const publicUrl = smartLinkPublicUrl(token, locale);
  const listingSlug = listing.slug;
  const locationLine = [listing.city, formatProvinceName(listing.province)].filter(Boolean).join(' · ');

  const showValuation =
    valuationBandEnabled() && data.includeValuationBand && data.valuationBand != null;

  return (
    <>
      <SmartLinkViewRecorder token={token} hadVisitorCookie={Boolean(visitor)} />
      <SmartLinkToolbar publicUrl={publicUrl} token={token} listingSlug={listingSlug} />
      <SmartLinkAgentCard locale={locale} token={token} data={{ agent: data.agent, agency: data.agency }} />
      <SmartLinkStatsStrip
        token={token}
        listingSlug={listingSlug}
        viewCount={data.stats.viewCount}
        uniqueViewCount={data.stats.uniqueViewCount}
      />

      <div className="mx-auto max-w-6xl px-5 pb-12 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
        <div className="min-w-0">
          <ListingPhotoGallery title={listing.title} urls={photoUrls} />
        </div>

        <aside className="space-y-5 rounded-xl2 border border-line bg-paper p-5 shadow-sm lg:sticky lg:top-20">
          <header>
            <p className="eyebrow mb-1">{locationLine || '—'}</p>
            {listingSlug ? (
              <h2 className="font-display text-xl font-semibold leading-snug">
                <Link href={`/listings/${listingSlug}`} className="text-azure hover:underline">
                  {listing.title}
                </Link>
              </h2>
            ) : (
              <h2 className="font-display text-xl font-semibold text-ink leading-snug">{listing.title}</h2>
            )}
          </header>

          <ListingPriceLines listing={parsed} locale={locale} />

          <section aria-labelledby="smartlink-facts-heading">
            <h3 id="smartlink-facts-heading" className="sr-only">
              {tDetail('factsHeading')}
            </h3>
            <ListingFactsTable listing={parsed} locale={locale} />
          </section>

          {listing.features.length > 0 ? (
            <section aria-labelledby="smartlink-features">
              <h3 id="smartlink-features" className="font-display text-base font-semibold text-ink mb-3">
                {t('characteristics')}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {listing.features.map((slug) => {
                  const key = slug as 'garden';
                  const label = tf.has(`feature.${key}`) ? tf(`feature.${key}`) : slug;
                  return (
                    <li key={slug}>
                      <span className="inline-flex rounded-md border border-line bg-sand/60 px-3 py-1.5 text-sm text-ink">
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      {showValuation ? (
        <div className="mx-auto max-w-6xl px-5 pb-12">
          <ValuationBandPanel data={data.valuationBand!} />
        </div>
      ) : null}
    </>
  );
}
