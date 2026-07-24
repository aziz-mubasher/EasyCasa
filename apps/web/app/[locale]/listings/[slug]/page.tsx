import { notFound } from 'next/navigation';
import { getListing } from '@/lib/api';
import { euro, area } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { ListingStructuredData } from '@/components/StructuredData';
import { ContactEnquiryForm } from '@/components/listings/ContactEnquiryForm';
import { SmartLinkManager } from '@/components/smartlink/SmartLinkManager';
import { ListingValuationBandSection } from '@/components/valuation/ListingValuationBandSection';

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const l = await getListing(slug);
  if (!l) notFound();

  const price = typeof l.price === 'string' ? Number(l.price) : (l.price as number | null);
  const rent = l.transactionType === 'rent';
  const sizeSqm =
    typeof l.sizeSqm === 'string' ? Number(l.sizeSqm) : (l.sizeSqm as number | null);
  const listingId = String(l.id ?? slug);
  const title = String(l.title);

  return (
    <article className="mx-auto max-w-5xl px-5 py-10">
      <ListingStructuredData
        locale={locale}
        listing={{
          slug: String(l.slug ?? slug),
          title,
          description: l.description ? String(l.description) : undefined,
          price: price ?? undefined,
          currency: typeof l.currency === 'string' ? l.currency : 'EUR',
          city: l.city ? String(l.city) : undefined,
          sizeSqm: sizeSqm ?? undefined,
          bedrooms: typeof l.bedrooms === 'number' ? l.bedrooms : undefined,
          bathrooms: typeof l.bathrooms === 'number' ? l.bathrooms : undefined,
          latitude: typeof l.latitude === 'number' ? l.latitude : undefined,
          longitude: typeof l.longitude === 'number' ? l.longitude : undefined,
        }}
      />
      <p className="eyebrow mb-2">
        {String(l.city ?? '')} {l.latitude ? `· ${Number(l.latitude).toFixed(3)}°N` : ''}
      </p>
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <h1 className="font-display text-4xl font-semibold max-w-2xl">{title}</h1>
        <Badge tone={rent ? 'pine' : 'ink'}>{rent ? 'affitto' : 'vendita'}</Badge>
      </div>

      <div className="data text-3xl mt-4">
        {euro(price)}
        {rent && <span className="text-muted text-lg">/mese</span>}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 max-w-md data text-sm">
        <div>
          <div className="eyebrow">camere</div>
          {(l.bedrooms as number) ?? '—'}
        </div>
        <div>
          <div className="eyebrow">bagni</div>
          {(l.bathrooms as number) ?? '—'}
        </div>
        <div>
          <div className="eyebrow">superficie</div>
          {area(sizeSqm)}
        </div>
      </div>

      {l.description ? (
        <p className="mt-8 max-w-2xl leading-relaxed whitespace-pre-line">{String(l.description)}</p>
      ) : null}

      <ListingValuationBandSection slug={String(l.slug ?? slug)} />

      <SmartLinkManager listingId={listingId} />

      <ContactEnquiryForm listingId={listingId} listingTitle={title} />
    </article>
  );
}
