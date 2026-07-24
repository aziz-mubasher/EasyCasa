import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ListingPhotoGallery } from '@/components/smartlink/ListingPhotoGallery';
import { ShareViewRecorder } from '@/components/smartlink/ShareViewRecorder';
import { ValuationBandPanel } from '@/components/valuation/ValuationBandPanel';
import { Badge } from '@/components/ui/Badge';
import { absoluteMediaUrl, fetchPublicShare } from '@/lib/share-link';
import { fetchListingValuationBand, valuationBandEnabled } from '@/lib/valuation-band';
import { area, euro } from '@/lib/format';

type Props = { params: Promise<{ locale: string; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token, locale } = await params;
  const data = await fetchPublicShare(token);
  if (!data) return { title: 'SmartLink' };

  const title = data.listing.title;
  const city = data.listing.city ?? '';
  const price =
    data.listing.price != null
      ? euro(data.listing.price, locale)
      : undefined;
  const description =
    data.listing.description?.slice(0, 160) ??
    [city, price].filter(Boolean).join(' · ');

  const image = absoluteMediaUrl(data.listing.coverUrl ?? data.listing.media[0]?.url ?? null);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale,
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function priceLabel(
  t: Awaited<ReturnType<typeof getTranslations>>,
  price: number | null,
  rent: boolean,
  locale: string,
) {
  if (price == null) return t('onRequest');
  return rent ? `${euro(price, locale)}${t('perMonth')}` : euro(price, locale);
}

export default async function SmartLinkPage({ params }: Props) {
  const { token, locale } = await params;
  const data = await fetchPublicShare(token);
  if (!data) notFound();

  const t = await getTranslations('smartLink');
  const tf = await getTranslations('search.filters');
  const listing = data.listing;
  const imageUrls = listing.media.map((m) => m.url);
  const includesSale = listing.transactionTypes.includes('sale') || listing.transactionType === 'sale';
  const includesRent = listing.transactionTypes.includes('rent') || listing.transactionType === 'rent';

  let band = null;
  if (data.includeValuationBand && valuationBandEnabled() && includesSale) {
    try {
      band = await fetchListingValuationBand(listing.slug);
    } catch {
      band = null;
    }
  }

  const phoneDigits = data.agent.phone?.replace(/\D/g, '') ?? '';
  const waHref = phoneDigits ? `https://wa.me/${phoneDigits}` : null;

  return (
    <article className="mx-auto max-w-5xl px-5 py-10">
      <ShareViewRecorder token={token} />

      <header className="rounded-xl2 border border-line bg-paper p-6 mb-8">
        <p className="eyebrow text-azure">{t('brandLine')}</p>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          {data.agent.avatarUrl ? (
            <img
              src={data.agent.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover border border-line"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold text-ink">{data.agent.displayName}</h1>
            <p className="mt-1 text-sm text-muted">{t('agentTagline')}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {data.agent.phone ? (
                <a href={`tel:${data.agent.phone}`} className="text-ink underline">
                  {data.agent.phone}
                </a>
              ) : null}
              {waHref ? (
                <a href={waHref} className="text-azure underline" target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-line bg-sand/40 p-5 mb-8" aria-labelledby="agency-block">
        <h2 id="agency-block" className="font-display text-lg font-semibold">
          {data.agency.name}
        </h2>
        <ul className="mt-2 text-sm space-y-1">
          <li>
            <a href={`mailto:${data.agency.email}`} className="text-azure underline">
              {data.agency.email}
            </a>
          </li>
          {data.agency.phone ? <li>{data.agency.phone}</li> : null}
        </ul>
      </section>

      <section className="mb-6 data text-sm" aria-labelledby="view-stats">
        <h2 id="view-stats" className="sr-only">
          {t('statsHeading')}
        </h2>
        <p>
          {t('statsValue', { views: data.viewCount, unique: data.uniqueViewCount })}{' '}
          <span className="text-muted">— {t('statsHint')}</span>
        </p>
      </section>

      <ListingPhotoGallery title={listing.title} urls={imageUrls} />

      <div className="mt-8">
        <h2 className="font-display text-3xl font-semibold text-ink">{listing.title}</h2>
        <p className="eyebrow mt-2">
          {[listing.city, listing.province].filter(Boolean).join(' · ')}
        </p>

        <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
          {includesSale ? (
            <div>
              <dt className="text-muted">{t('forSale')}</dt>
              <dd className="data text-lg">{priceLabel(t, listing.price, false, locale)}</dd>
            </div>
          ) : null}
          {includesRent ? (
            <div>
              <dt className="text-muted">{t('forRent')}</dt>
              <dd className="data text-lg">{priceLabel(t, listing.price, true, locale)}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 data text-sm">
          <div>
            <div className="eyebrow">{t('bathrooms')}</div>
            {listing.bathrooms ?? '—'}
          </div>
          <div>
            <div className="eyebrow">{t('rooms')}</div>
            {listing.rooms ?? listing.bedrooms ?? '—'}
          </div>
          <div>
            <div className="eyebrow">{t('builtSurface')}</div>
            {area(listing.sizeSqm)}
          </div>
          <div>
            <div className="eyebrow">{t('yearBuilt')}</div>
            {listing.yearBuilt ?? '—'}
          </div>
          {listing.energyClass ? (
            <div>
              <div className="eyebrow">{t('energy')}</div>
              {listing.energyClass}
            </div>
          ) : null}
        </div>

        {listing.features.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {listing.features.map((f) => (
              <li key={f}>
                <Badge tone="azure">{tf(`feature.${f as 'garden'}`)}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {listing.description ? (
          <p className="mt-8 max-w-2xl leading-relaxed whitespace-pre-line text-ink/90">
            {listing.description}
          </p>
        ) : null}
      </div>

      {band ? (
        <div className="mt-10">
          <ValuationBandPanel data={band} />
        </div>
      ) : null}

      <footer className="mt-12 border-t border-line pt-6 text-center text-sm text-muted">
        <p className="font-display text-ink">{t('footerBrand')}</p>
        <p className="mt-1">{t('footerCommission')}</p>
      </footer>
    </article>
  );
}
