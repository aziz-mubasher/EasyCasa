/**
 * Phase 27 client surface — the free AVM. `estimate` returns a min/mid/max
 * valuation with a confidence and basis, and (when contact is provided) a
 * requestId — the lead into the paid certified valuation.
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';

export const PropertyTypeSchema = z.enum(['apartment', 'house', 'villa', 'room', 'land', 'commercial']);
export const EnergyClassSchema = z.enum(['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G']);
export const ConditionSchema = z.enum(['new', 'renovated', 'good', 'to_renovate']);

export interface SubjectProperty {
  comune: string;
  provincia: string;
  lat: number;
  lng: number;
  type: z.infer<typeof PropertyTypeSchema>;
  areaM2: number;
  rooms: number;
  floor?: number | null;
  energyClass?: z.infer<typeof EnergyClassSchema> | null;
  condition?: z.infer<typeof ConditionSchema> | null;
  yearBuilt?: number | null;
}

export const ValuationEstimateSchema = z.object({
  pointCents: z.number().int(),
  minCents: z.number().int(),
  maxCents: z.number().int(),
  pricePerM2Cents: z.number().int(),
  confidence: z.enum(['low', 'medium', 'high']),
  basis: z.enum(['comparables', 'omi', 'blended']),
  comparablesUsed: z.number().int(),
});
export type ValuationEstimate = z.infer<typeof ValuationEstimateSchema>;

export const EstimateResultSchema = z.object({
  estimate: ValuationEstimateSchema,
  requestId: z.string().nullable(),
});
export type EstimateResult = z.infer<typeof EstimateResultSchema>;

export class EasyCasaValuationApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(opts: RequesterOptions) {
    this.request = createRequester(opts);
  }

  estimate(body: { subject: SubjectProperty; contactEmail?: string }): Promise<EstimateResult> {
    return this.request('/avm/estimate', EstimateResultSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
