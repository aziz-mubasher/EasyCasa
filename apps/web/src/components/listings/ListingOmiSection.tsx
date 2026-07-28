import { fetchListingValuationBand, valuationBandEnabled } from '@/lib/valuation-band';
import { ListingOmiBand } from '@/components/listings/ListingOmiBand';

/** Public OMI/market band on listing detail — gated only by feature flag (not sign-in). */
export async function ListingOmiSection({ slug }: { slug: string }) {
  if (!valuationBandEnabled()) return null;
  try {
    const data = await fetchListingValuationBand(slug);
    if (data.status !== 'ok') return null;
    return <ListingOmiBand data={data} />;
  } catch {
    return null;
  }
}
