import { getTranslations } from 'next-intl/server';
import { area, euro } from '@/lib/format';
import {
  listingShowsSale,
  pricePerSqm,
  type ParsedListingDetail,
} from '@/lib/listing-detail';
import { ListingPriceLines } from '@/components/listings/ListingFactsTable';
import { formatProvinceName } from '@/lib/province-display';

type FactRow = { label: string; value: string };

/** All property facts for the side panel next to the gallery (no secondary details page). */
async function summaryFactRows(listing: ParsedListingDetail, locale: string): Promise<FactRow[]> {
  const t = await getTranslations('listingDetail');
  const ts = await getTranslations('search.filters');
  const rows: FactRow[] = [];

  const provinceName = formatProvinceName(listing.province);
  if (provinceName) rows.push({ label: t('facts.province'), value: provinceName });
  if (listing.city) rows.push({ label: t('facts.city'), value: listing.city });
  if (listing.address) rows.push({ label: t('facts.address'), value: listing.address });

  const rooms = listing.rooms ?? listing.bedrooms;
  if (rooms != null) rows.push({ label: t('facts.rooms'), value: String(rooms) });
  if (listing.bedrooms != null && listing.rooms != listing.bedrooms) {
    rows.push({ label: t('facts.bedrooms'), value: String(listing.bedrooms) });
  }
  if (listing.bathrooms != null) rows.push({ label: t('facts.bathrooms'), value: String(listing.bathrooms) });
  if (listing.sizeSqm != null) rows.push({ label: t('facts.builtSurface'), value: area(listing.sizeSqm) });
  if (listing.surfaceSqm != null && listing.surfaceSqm !== listing.sizeSqm) {
    rows.push({ label: t('facts.commercialSurface'), value: area(listing.surfaceSqm) });
  }
  if (listing.landSqm != null) rows.push({ label: t('facts.landSurface'), value: area(listing.landSqm) });
  if (listing.floor) rows.push({ label: t('facts.floor'), value: listing.floor });
  if (listing.totalFloors != null) {
    rows.push({ label: t('facts.totalFloors'), value: String(listing.totalFloors) });
  }
  if (listing.yearBuilt != null) rows.push({ label: t('facts.yearBuilt'), value: String(listing.yearBuilt) });
  if (listing.yearRenovated != null) {
    rows.push({ label: t('facts.yearRenovated'), value: String(listing.yearRenovated) });
  }
  if (listing.energyClass) {
    rows.push({ label: t('facts.energyClass'), value: listing.energyClass.toUpperCase() });
  }
  if (listing.energyPerformanceKwhM2Y != null) {
    rows.push({
      label: t('facts.energyPerformance'),
      value: t('facts.energyPerformanceValue', { value: listing.energyPerformanceKwhM2Y }),
    });
  }

  const perM2 = pricePerSqm(
    listing.price != null && listing.price > 0 ? listing.price : null,
    listing.sizeSqm ?? listing.surfaceSqm,
  );
  if (perM2 != null && listingShowsSale(listing.transactionTypes, listing.transactionType)) {
    rows.push({ label: t('facts.pricePerSqm'), value: euro(perM2, locale) });
  }

  if (listing.condition) {
    const condKey = listing.condition as 'good';
    rows.push({
      label: t('facts.condition'),
      value: ts.has(`condition.${condKey}`) ? ts(`condition.${condKey}`) : listing.condition,
    });
  }
  if (listing.status) {
    const statusKey = listing.status as 'published';
    rows.push({
      label: t('facts.status'),
      value: t.has(`status.${statusKey}`) ? t(`status.${statusKey}`) : listing.status,
    });
  }

  if (listing.foglio) rows.push({ label: t('catasto.foglio'), value: listing.foglio });
  if (listing.particella) rows.push({ label: t('catasto.particella'), value: listing.particella });
  if (listing.subalterno) rows.push({ label: t('catasto.subalterno'), value: listing.subalterno });

  return rows;
}

/** Side panel next to gallery: title, price, full facts, characteristics. */
export async function ListingSummaryCard({
  listing,
  locale,
}: {
  listing: ParsedListingDetail;
  locale: string;
}) {
  const t = await getTranslations('listingDetail');
  const tf = await getTranslations('search.filters');
  const rows = await summaryFactRows(listing, locale);
  return (
    <div className="rounded-xl2 border border-line bg-paper p-5 sm:p-6 shadow-sm space-y-5 h-full lg:sticky lg:top-28">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-semibold text-ink leading-snug">
          {listing.title}
        </h1>
        <div className="mt-3">
          <ListingPriceLines listing={listing} locale={locale} />
        </div>
      </div>

      {rows.length > 0 ? (
        <dl className="border-t border-line divide-y divide-line/80 max-h-[min(60vh,32rem)] overflow-y-auto">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
              <dt className="text-muted shrink-0">{row.label}</dt>
              <dd className="data text-ink text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {listing.features.length > 0 ? (
        <div className="border-t border-line pt-4">
          <p className="eyebrow mb-3">{t('characteristics')}</p>
          <ul className="flex flex-wrap gap-2">
            {listing.features.map((featureSlug) => {
              const key = featureSlug as 'garden';
              const label = tf.has(`feature.${key}`) ? tf(`feature.${key}`) : featureSlug;
              return (
                <li key={featureSlug}>
                  <span className="inline-flex rounded-md bg-sand px-2.5 py-1 text-xs text-ink">
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
