/**
 * Phase 21 client — listing detail + similar. Powers the property page:
 * gallery, key facts, energy/APE, catastal, map, quality, similar strip.
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';
import {
  DealTypeSchema,
  EnergyClassSchema,
  PropertyTypeSchema,
} from './phase20';

export const PhotoSchema = z.object({
  url: z.string(),
  sortOrder: z.number().int(),
});

export const ListingDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  dealType: DealTypeSchema,
  type: PropertyTypeSchema,
  status: z.string(),
  priceCents: z.number().int(),
  pricePerM2Cents: z.number().int().nullable(),
  keyFacts: z.object({
    areaM2: z.number(),
    rooms: z.number().int(),
    bathrooms: z.number().int().nullable(),
    floor: z.number().int().nullable(),
    totalFloors: z.number().int().nullable(),
    yearBuilt: z.number().int().nullable(),
    heating: z.string().nullable(),
    condominioFeesCents: z.number().int().nullable(),
  }),
  energy: z.object({
    present: z.boolean(),
    energyClass: EnergyClassSchema.nullable(),
    performanceKwhM2Y: z.number().nullable(),
  }),
  catastal: z
    .object({
      foglio: z.string(),
      particella: z.string(),
      subalterno: z.string().nullable(),
      display: z.string(),
    })
    .nullable(),
  features: z.array(z.string()),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
    comune: z.string(),
    provincia: z.string(),
  }),
  photos: z.array(PhotoSchema),
  hasFloorPlan: z.boolean(),
  quality: z.object({ score: z.number().int(), missing: z.array(z.string()) }),
  agent: z.object({ id: z.string(), displayName: z.string() }).nullable(),
});
export type ListingDetail = z.infer<typeof ListingDetailSchema>;

export const SimilarPinSchema = z.object({
  listingId: z.string(),
  title: z.string(),
  priceCents: z.number().int(),
  areaM2: z.number(),
  lat: z.number(),
  lng: z.number(),
  thumbnailUrl: z.string().nullable(),
});
export type SimilarPin = z.infer<typeof SimilarPinSchema>;

export class EasyCasaListingsApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(private readonly opts: RequesterOptions) {
    this.request = createRequester(opts);
  }

  /** By listing UUID (Phase 20 cluster) or slug. */
  getListing(idOrSlug: string): Promise<ListingDetail> {
    return this.request(`/listings/${encodeURIComponent(idOrSlug)}`, ListingDetailSchema);
  }

  getSimilar(idOrSlug: string): Promise<SimilarPin[]> {
    return this.request(
      `/listings/${encodeURIComponent(idOrSlug)}/similar`,
      z.array(SimilarPinSchema),
    );
  }
}
