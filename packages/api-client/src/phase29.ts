/**
 * Phase 29 client — viewings & scheduling. Seekers fetch slots and book;
 * owners/mediators set availability and manage the lifecycle. Times are epoch ms.
 *
 * EC-S-T21/T22 — seller conductor surface mirrors agent paths under `/seller/...`
 * (flag-gated server-side). Capacity is optional on availability windows.
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
  /** ICS SEQUENCE — present when API returns it (reschedule support). */
  icsSequence: z.number().int().optional(),
  timezone: z.string().optional(),
  /** City/province — preferred when REQUESTED (street withheld). */
  areaLabel: z.string().nullable().optional(),
  /** Street address — preferred when CONFIRMED / for conductor. */
  address: z.string().nullable().optional(),
  listingTitle: z.string().nullable().optional(),
  b4aBandMaxCents: z.number().int().nullable().optional(),
  b4aExpiresAt: z.string().nullable().optional(),
});
export type Viewing = z.infer<typeof ViewingSchema>;

export interface AvailabilityWindow {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
  /** EC-S T22 — max CONFIRMED per concrete slot (default 1). */
  capacity?: number;
}

const WindowSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMinutes: z.number().int().min(0).max(1440),
  endMinutes: z.number().int().min(0).max(1440),
  capacity: z.number().int().min(1).max(100).optional(),
});

export type ViewingAction = 'confirm' | 'cancel' | 'complete' | 'no-show';

/** Agent conductor paths vs flag-gated seller conductor surface (T21). */
export type ViewingsConductorSurface = 'agent' | 'seller';

const OkSchema = z.object({ ok: z.literal(true) });

export const VIEWING_CAPACITY_FULL_CODE = 'viewings.errors.capacityFull';

export function isViewingCapacityFullError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const body = 'body' in err ? (err as { body?: unknown }).body : undefined;
  if (!body || typeof body !== 'object') return false;
  return (body as { code?: string }).code === VIEWING_CAPACITY_FULL_CODE;
}

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

  getAvailability(
    listingId: string,
    surface: ViewingsConductorSurface = 'agent',
  ): Promise<AvailabilityWindow[]> {
    const path =
      surface === 'seller'
        ? `/seller/listings/${encodeURIComponent(listingId)}/availability`
        : `/listings/${encodeURIComponent(listingId)}/availability`;
    return this.request(path, z.object({ windows: z.array(WindowSchema) })).then(
      (r) => r.windows,
    );
  }

  setAvailability(
    listingId: string,
    windows: AvailabilityWindow[],
    source: 'publish' | 'edit' = 'publish',
    surface: ViewingsConductorSurface = 'agent',
  ): Promise<void> {
    const qs = source === 'edit' ? '?source=edit' : '';
    const path =
      surface === 'seller'
        ? `/seller/listings/${encodeURIComponent(listingId)}/availability${qs}`
        : `/listings/${encodeURIComponent(listingId)}/availability${qs}`;
    return this.request(path, OkSchema, {
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

  listConducting(surface: ViewingsConductorSurface = 'agent'): Promise<Viewing[]> {
    const path =
      surface === 'seller' ? '/seller/viewings/conducting' : '/me/viewings/conducting';
    return this.request(path, z.array(ViewingSchema));
  }

  act(
    id: string,
    action: ViewingAction,
    surface: ViewingsConductorSurface = 'agent',
  ): Promise<Viewing> {
    const path =
      surface === 'seller'
        ? `/seller/viewings/${encodeURIComponent(id)}/${action}`
        : `/viewings/${encodeURIComponent(id)}/${action}`;
    return this.request(path, ViewingSchema, {
      method: 'POST',
    });
  }

  /** Propose a new slot — returns REQUESTED with bumped icsSequence. */
  reschedule(
    id: string,
    startMs: number,
    surface: ViewingsConductorSurface = 'agent',
  ): Promise<Viewing> {
    const path =
      surface === 'seller'
        ? `/seller/viewings/${encodeURIComponent(id)}/reschedule`
        : `/viewings/${encodeURIComponent(id)}/reschedule`;
    return this.request(path, ViewingSchema, {
      method: 'POST',
      body: JSON.stringify({ startMs }),
    });
  }
}
