import { getTranslations } from 'next-intl/server';
import { area, euro } from '@/lib/format';
import {
  listingShowsRent,
  listingShowsSale,
  pricePerSqm,
  type ParsedListingDetail,
} from '@/lib/listing-detail';

type FactRow = { label: string; value: string };

export async function ListingFactsTable({ listing, locale }: { listing: ParsedListingDetail; locale: string }) {
  const t = await getTranslations('listingDetail');
  const ts = await getTranslations('search.filters');

  const rows: FactRow[] = [];

  if (listing.province) rows.push({ label: t('facts.province'), value: listing.province });
  if (listing.city) rows.push({ label: t('facts.city'), value: listing.city });
  const rooms = listing.rooms ?? listing.bedrooms;
  if (rooms != null) rows.push({ label: t('facts.rooms'), value: String(rooms) });
  if (listing.bedrooms != null && listing.rooms != listing.bedrooms) {
    rows.push({ label: t('facts.bedrooms'), value: String(listing.bedrooms) });
  }
  if (listing.bathrooms != null) rows.push({ label: t('facts.bathrooms'), value: String(listing.bathrooms) });
  if (listing.sizeSqm != null) rows.push({ label: t('facts.builtSurface'), value: area(listing.sizeSqm) });
  if (listing.surfaceSqm != null) rows.push({ label: t('facts.commercialSurface'), value: area(listing.surfaceSqm) });
  if (listing.landSqm != null) rows.push({ label: t('facts.landSurface'), value: area(listing.landSqm) });
  if (listing.floor != null) rows.push({ label: t('facts.floor'), value: listing.floor });
  if (listing.totalFloors != null) {
    rows.push({ label: t('facts.totalFloors'), value: String(listing.totalFloors) });
  }
  if (listing.yearBuilt != null) rows.push({ label: t('facts.yearBuilt'), value: String(listing.yearBuilt) });
  if (listing.yearRenovated != null) {
    rows.push({ label: t('facts.yearRenovated'), value: String(listing.yearRenovated) });
  }
  if (listing.energyClass) rows.push({ label: t('facts.energyClass'), value: listing.energyClass.toUpperCase() });
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
    const condLabel = ts.has(`condition.${condKey}`)
      ? ts(`condition.${condKey}`)
      : listing.condition;
    rows.push({ label: t('facts.condition'), value: condLabel });
  }

  if (listing.status) {
    const statusKey = listing.status as 'published';
    const statusLabel = t.has(`status.${statusKey}`) ? t(`status.${statusKey}`) : listing.status;
    rows.push({ label: t('facts.status'), value: statusLabel });
  }

  if (rows.length === 0) return null;

  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-line/80 last:border-0">
            <th scope="row" className="py-2.5 pr-4 text-left font-normal text-muted align-top w-[45%]">
              {row.label}
            </th>
            <td className="py-2.5 data text-ink align-top">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export async function ListingPriceLines({
  listing,
  locale,
}: {
  listing: ParsedListingDetail;
  locale: string;
}) {
  const t = await getTranslations('listingDetail');
  const sale = listingShowsSale(listing.transactionTypes, listing.transactionType);
  const rent = listingShowsRent(listing.transactionTypes, listing.transactionType);
  const priceLabel =
    listing.price != null && listing.price > 0
      ? euro(listing.price, locale)
      : t('onRequest');

  return (
    <div className="space-y-1 data">
      {sale ? (
        <p className="text-2xl font-medium text-ink">
          <span className="text-muted text-sm font-normal mr-2">{t('forSale')}</span>
          {priceLabel}
        </p>
      ) : null}
      {rent ? (
        <p className={`${sale ? 'text-xl' : 'text-2xl'} font-medium text-pine`}>
          <span className="text-muted text-sm font-normal mr-2">{t('forRent')}</span>
          {listing.price != null && listing.price > 0 ? (
            <>
              {euro(listing.price, locale)}
              <span className="text-muted text-base">{t('perMonth')}</span>
            </>
          ) : (
            t('onRequestPerMonth')
          )}
        </p>
      ) : null}
      {!sale && !rent && listing.price != null ? (
        <p className="text-2xl font-medium">{priceLabel}</p>
      ) : null}
    </div>
  );
}
