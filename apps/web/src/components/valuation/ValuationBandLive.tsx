'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  previewValuationBand,
  taxonomySlugToAvmType,
  type ValuationBandResponseDto,
  valuationBandEnabled,
} from '@/lib/valuation-band';
import { ValuationBandPanel } from './ValuationBandPanel';

export interface ValuationBandLiveProps {
  comune: string;
  provincia: string;
  propertyTypeSlug: string;
  sizeSqm: string;
  priceEur: string;
  transactionType: string;
}

export function ValuationBandLive(props: ValuationBandLiveProps) {
  const enabled = valuationBandEnabled();
  const [data, setData] = useState<ValuationBandResponseDto | null>(null);
  const [loading, setLoading] = useState(false);

  const avmType = useMemo(
    () => taxonomySlugToAvmType(props.propertyTypeSlug),
    [props.propertyTypeSlug],
  );

  const size = Number(props.sizeSqm);
  const price = Number(props.priceEur);

  useEffect(() => {
    if (!enabled) return;
    if (props.transactionType === 'rent') {
      setData({ status: 'unavailable', reason: 'unsupported_listing' });
      return;
    }
    if (!props.provincia || !avmType) {
      setData(null);
      return;
    }
    if (!(size > 0)) {
      setData({ status: 'unavailable', reason: 'missing_surface' });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      void previewValuationBand({
        comune: props.comune.trim(),
        provincia: props.provincia,
        propertyType: avmType,
        sizeSqm: size,
        askingPriceEur: price > 0 ? price : undefined,
      })
        .then((res) => {
          if (!controller.signal.aborted) setData(res);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setData({ status: 'unavailable', reason: 'insufficient_data' });
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, props.comune, props.provincia, props.transactionType, avmType, size, price]);

  if (!enabled) return null;
  if (!data && !loading) return null;

  return (
    <div className="mt-6" aria-busy={loading}>
      {data ? <ValuationBandPanel data={data} /> : null}
    </div>
  );
}
