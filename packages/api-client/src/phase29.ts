/**
 * Phase 29 client — viewings & scheduling. Seekers fetch slots and book;
 * owners/mediators set availability and manage the lifecycle. Times are epoch ms.
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';

export const ViewingStatusSchema = z.enum([
  'REQUESTED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);
export type ViewingStatus = z.infer<typeof ViewingStatusSchema>;

export const SlotSchema = z.object({
  startMs: z.number().int(),
  endMs: z.number().int(),
});
export type Slot = z.infer<typeof SlotSchema>;

export const ViewingSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  seekerUserId: z.string(),
  conductorUserId: z.string(),
  enquiryId: z.string().nullable(),
  startMs: z.number().int(),
  endMs: z.number().int(),
  status: ViewingStatusSchema,
});
export type Viewing = z.infer<typeof ViewingSchema>;

export interface AvailabilityWindow {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
}

export type ViewingAction = 'confirm' | 'cancel' | 'complete' | 'no-show';

const OkSchema = z.object({ ok: z.literal(true) });

export class EasyCasaViewingsApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(opts: RequesterOptions) {
    this.request = createRequester(opts);
  }

  /** Bookable slots for a listing over [fromMs, toMs]. */
  slots(listingId: string, fromMs: number, toMs: number): Promise<Slot[]> {
    const qs = `?from=${fromMs}&to=${toMs}`;
    return this.request(`/listings/${encodeURIComponent(listingId)}/slots${qs}`, z.array(SlotSchema));
  }

  setAvailability(listingId: string, windows: AvailabilityWindow[]): Promise<void> {
    return this.request(`/listings/${encodeURIComponent(listingId)}/availability`, OkSchema, {
      method: 'POST',
      body: JSON.stringify({ windows }),
    }).then(() => undefined);
  }

  book(listingId: string, body: { startMs: number; enquiryId?: string }): Promise<Viewing> {
    return this.request(`/listings/${encodeURIComponent(listingId)}/viewings`, ViewingSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  listMine(): Promise<Viewing[]> {
    return this.request('/me/viewings', z.array(ViewingSchema));
  }

  listConducting(): Promise<Viewing[]> {
    return this.request('/me/viewings/conducting', z.array(ViewingSchema));
  }

  act(id: string, action: ViewingAction): Promise<Viewing> {
    return this.request(`/viewings/${encodeURIComponent(id)}/${action}`, ViewingSchema, {
      method: 'POST',
    });
  }
}
