import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { area, euro } from '@/lib/format';
import {
  listingShowsSale,
  pricePerSqm,
  type ParsedListingDetail,
} from '@/lib/listing-detail';

type Row = { label: string; value: ReactNode; key: string };

/** Scheda immobile — facts as an official register (comp-03). */
export async function ListingScheda({
  listing,
  locale,
}: {
  listing: ParsedListingDetail;
  locale: string;
}) {
  const t = await getTranslations('listingDetail');
  const ts = await getTranslations('search.filters');
  const rows: Row[] = [];

  const commercial = listing.surfaceSqm ?? listing.sizeSqm;
  if (commercial != null) {
    rows.push({
      key: 'commercial',
      label: t('facts.commercialSurface'),
      value: area(commercial),
    });
  }
  const rooms = listing.rooms ?? listing.bedrooms;
  if (rooms != null) rows.push({ key: 'rooms', label: t('facts.rooms'), value: String(rooms) });
  if (listing.bathrooms != null) {
    rows.push({ key: 'baths', label: t('facts.bathrooms'), value: String(listing.bathrooms) });
  }

  if (listing.floor || listing.totalFloors != null) {
    const floorParts: string[] = [];
    if (listing.floor) floorParts.push(listing.floor);
    if (listing.totalFloors != null) {
      floorParts.push(t('facts.floorOf', { total: listing.totalFloors }));
    }
    const hasElevator = listing.features.includes('elevator');
    rows.push({
      key: 'floor',
      label: t('facts.floor'),
      value: `${floorParts.join(' · ')}${hasElevator ? ` · ${t('facts.withElevator')}` : ''}`,
    });
  }

  if (listing.yearBuilt != null) {
    rows.push({ key: 'year', label: t('facts.yearBuilt'), value: String(listing.yearBuilt) });
  }
  if (listing.condition) {
    const condKey = listing.condition as 'good';
    rows.push({
      key: 'cond',
      label: t('facts.condition'),
      value: ts.has(`condition.${condKey}`) ? ts(`condition.${condKey}`) : listing.condition,
    });
  }

  if (listing.energyClass) {
    rows.push({
      key: 'ape',
      label: t('facts.energyClass'),
      value: (
        <span className="ld-ape">
          <b>{listing.energyClass.toUpperCase()}</b>
        </span>
      ),
    });
  }
  if (listing.energyPerformanceKwhM2Y != null) {
    rows.push({
      key: 'epi',
      label: t('facts.energyPerformance'),
      value: t('facts.energyPerformanceValue', { value: listing.energyPerformanceKwhM2Y }),
    });
  }

  if (listing.condominioFeesCents != null && listing.condominioFeesCents > 0) {
    const yearly = listing.condominioFeesCents / 100;
    rows.push({
      key: 'condo',
      label: t('facts.condoFees'),
      value: t('facts.condoFeesValue', { amount: euro(yearly, locale) }),
    });
  }
  if (listing.heating) {
    rows.push({ key: 'heat', label: t('facts.heating'), value: listing.heating });
  }

  if (rows.length === 0) return null;

  return (
    <section className="ld-scheda" aria-labelledby="ld-scheda-heading">
      <h2 id="ld-scheda-heading">{t('scheda.heading')}</h2>
      <dl>
        {rows.map((row) => (
          <div key={row.key}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export async function ListingPriceBlock({
  listing,
  locale,
}: {
  listing: ParsedListingDetail;
  locale: string;
}) {
  const t = await getTranslations('listingDetail');
  const sale = listingShowsSale(listing.transactionTypes, listing.transactionType);
  const surface = listing.surfaceSqm ?? listing.sizeSqm;
  const perM2 = pricePerSqm(
    listing.price != null && listing.price > 0 ? listing.price : null,
    surface,
  );

  const priceLabel =
    listing.price != null && listing.price > 0 ? euro(listing.price, locale) : t('onRequest');

  return (
    <>
      <p className="ld-price">{priceLabel}</p>
      {sale && perM2 != null && surface != null ? (
        <p className="ld-pricem2">
          {t('pricePerSqmLine', {
            perM2: euro(perM2, locale),
            surface: area(surface),
          })}
        </p>
      ) : (
        <div className="ld-pricem2" aria-hidden />
      )}
    </>
  );
}
