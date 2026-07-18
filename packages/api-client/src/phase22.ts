/**
 * Phase 22 client surface — saved searches & alerts. Lets the seeker save a
 * Phase 20 search (filters + area) with an alert frequency and manage it.
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';

export const AlertFrequencySchema = z.enum(['instant', 'daily', 'off']);
export type AlertFrequency = z.infer<typeof AlertFrequencySchema>;

/** Mirrors the Phase 20 search criteria (kept loose so the shapes stay in sync). */
export interface SavedSearchCriteria {
  filters: {
    dealType?: 'sale' | 'rent';
    priceMinCents?: number;
    priceMaxCents?: number;
    types?: string[];
    minRooms?: number;
    minAreaM2?: number;
    energyClasses?: string[];
  };
  bbox?: { minLat: number; minLng: number; maxLat: number; maxLng: number };
  polygon?: { lat: number; lng: number }[];
}

export const AlertSavedSearchSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  criteria: z.object({}).passthrough(),
  frequency: AlertFrequencySchema,
  lastRunAt: z.string().nullable(),
});
export type AlertSavedSearch = z.infer<typeof AlertSavedSearchSchema>;

export class EasyCasaSavedSearchesApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(private readonly opts: RequesterOptions) {
    this.request = createRequester(opts);
  }

  create(body: {
    name: string;
    criteria: SavedSearchCriteria;
    frequency: AlertFrequency;
  }): Promise<AlertSavedSearch> {
    return this.request('/me/saved-searches', AlertSavedSearchSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  list(): Promise<AlertSavedSearch[]> {
    return this.request('/me/saved-searches', z.array(AlertSavedSearchSchema));
  }

  setFrequency(id: string, frequency: AlertFrequency): Promise<AlertSavedSearch> {
    return this.request(
      `/me/saved-searches/${encodeURIComponent(id)}/frequency`,
      AlertSavedSearchSchema,
      {
        method: 'PUT',
        body: JSON.stringify({ frequency }),
      },
    );
  }

  remove(id: string): Promise<{ ok: true }> {
    return this.request(
      `/me/saved-searches/${encodeURIComponent(id)}`,
      z.object({ ok: z.literal(true) }),
      { method: 'DELETE' },
    );
  }
}
