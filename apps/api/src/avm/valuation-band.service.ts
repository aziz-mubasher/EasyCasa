import { Inject, Injectable } from '@nestjs/common';

import { apiConfig } from '../config';
import {
  AREA_VALUATION_PROVIDER,
  type AreaValuationProvider,
  type AreaValuationQuery,
} from './domain/area-valuation.port';
import type { PropertyType } from './domain/types';
import {
  buildValuationBand,
  unavailableBand,
  type ValuationBandResponse,
} from './domain/valuation-band';

export interface ValuationBandInput {
  comune: string;
  provincia: string;
  propertyType: PropertyType;
  sizeSqm: number;
  askingPriceEur?: number | null;
  lat?: number | null;
  lng?: number | null;
  excludeListingId?: string | null;
}

@Injectable()
export class ValuationBandService {
  constructor(@Inject(AREA_VALUATION_PROVIDER) private readonly areas: AreaValuationProvider) {}

  enabled(): boolean {
    return apiConfig.VALUATION_BAND_ENABLED;
  }

  async forInput(input: ValuationBandInput): Promise<ValuationBandResponse> {
    if (!this.enabled()) {
      return unavailableBand('feature_disabled');
    }
    if (!(input.sizeSqm > 0)) {
      return unavailableBand('missing_surface');
    }

    const query: AreaValuationQuery = {
      comune: input.comune,
      provincia: input.provincia,
      propertyType: input.propertyType,
      lat: input.lat,
      lng: input.lng,
      excludeListingId: input.excludeListingId,
    };

    const zone = await this.areas.bandForArea(query);
    if (!zone) {
      return unavailableBand('insufficient_data');
    }

    return buildValuationBand(input.sizeSqm, zone, input.askingPriceEur);
  }
}
