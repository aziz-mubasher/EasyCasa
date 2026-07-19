import { Inject, Injectable } from '@nestjs/common';

import { computeEstimate } from './domain/estimate';
import type { ComparablesPort, OmiPort, ValuationRequestLog } from './domain/ports';
import type { SubjectProperty, ValuationEstimate } from './domain/types';

export const COMPARABLES_PORT = Symbol('COMPARABLES_PORT');
export const OMI_PORT = Symbol('OMI_PORT');
export const VALUATION_REQUEST_LOG = Symbol('VALUATION_REQUEST_LOG');

export interface EstimateResult {
  estimate: ValuationEstimate;
  requestId: string | null;
}

@Injectable()
export class AvmService {
  constructor(
    @Inject(COMPARABLES_PORT) private readonly comps: ComparablesPort,
    @Inject(OMI_PORT) private readonly omi: OmiPort,
    @Inject(VALUATION_REQUEST_LOG) private readonly log: ValuationRequestLog,
  ) {}

  async estimate(
    subject: SubjectProperty,
    lead: { contactEmail?: string | null; userId?: string | null } = {},
  ): Promise<EstimateResult> {
    const [comps, band] = await Promise.all([
      this.comps.near(subject),
      this.omi.band(subject.comune, subject.provincia, subject.type),
    ]);

    const estimate = computeEstimate(subject, comps, band ?? undefined);

    // Capture the lead — this is the funnel into the paid valuation service.
    let requestId: string | null = null;
    if (lead.contactEmail || lead.userId) {
      const rec = await this.log.record({
        subject,
        estimate,
        contactEmail: lead.contactEmail ?? null,
        userId: lead.userId ?? null,
      });
      requestId = rec.id;
    }

    return { estimate, requestId };
  }
}
