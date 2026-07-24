import { Injectable } from '@nestjs/common';

import type {
  AreaValuationBandData,
  AreaValuationProvider,
  AreaValuationQuery,
} from './domain/area-valuation.port';
import { OmiAreaValuationProvider } from './omi-area-valuation.provider';
import { StubAreaValuationProvider } from './stub-area-valuation.provider';

/**
 * Prefer OMI when cached quotes exist for the area; otherwise provisional comparables.
 * Never labels OMI when the stub produced the band.
 */
@Injectable()
export class FallbackAreaValuationProvider implements AreaValuationProvider {
  constructor(
    private readonly omi: OmiAreaValuationProvider,
    private readonly stub: StubAreaValuationProvider,
  ) {}

  async bandForArea(query: AreaValuationQuery): Promise<AreaValuationBandData | null> {
    const fromOmi = await this.omi.bandForArea(query);
    if (fromOmi) return fromOmi;
    return this.stub.bandForArea(query);
  }
}
