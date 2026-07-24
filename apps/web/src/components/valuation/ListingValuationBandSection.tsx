import { fetchListingValuationBand, valuationBandEnabled } from '@/lib/valuation-band';
import { ValuationBandPanel } from '@/components/valuation/ValuationBandPanel';

export async function ListingValuationBandSection({ slug }: { slug: string }) {
  if (!valuationBandEnabled()) return null;
  try {
    const data = await fetchListingValuationBand(slug);
    if (data.status === 'unavailable' && data.reason === 'feature_disabled') return null;
    return (
      <div className="mt-8">
        <ValuationBandPanel data={data} />
      </div>
    );
  } catch {
    return null;
  }
}
