import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PRODUCT_EVENTS, weeklyHours } from '@easycasa/shared';

import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import { generateSlots } from './domain/slots';
import { DEFAULT_CONFIG, validateBooking, type SchedulingConfig } from './domain/booking';
import { nextViewingStatus, ViewingTransitionError } from './domain/ports';
import type {
  AvailabilityRepository,
  ViewingListingLookup,
  ViewingNotifier,
  ViewingRepository,
} from './domain/ports';
import type { AvailabilityWindow, Slot, Viewing, ViewingEvent } from './domain/types';
import { DEFAULT_LISTING_TIMEZONE } from './domain/zoned-time';

export const AVAILABILITY_REPOSITORY = Symbol('AVAILABILITY_REPOSITORY');
export const VIEWING_REPOSITORY = Symbol('VIEWING_REPOSITORY');
export const VIEWING_LISTING_LOOKUP = Symbol('VIEWING_LISTING_LOOKUP');
export const VIEWING_NOTIFIER = Symbol('VIEWING_NOTIFIER');

@Injectable()
export class ViewingsService {
  private readonly cfg: SchedulingConfig = DEFAULT_CONFIG;

  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(VIEWING_REPOSITORY) private readonly viewings: ViewingRepository,
    @Inject(VIEWING_LISTING_LOOKUP) private readonly listings: ViewingListingLookup,
    @Inject(VIEWING_NOTIFIER) private readonly notifier: ViewingNotifier,
    @Optional() private readonly analytics?: ProductAnalyticsService,
  ) {}

  /** Owner / mediator reads weekly availability windows. */
  async getAvailability(
    actorUserId: string,
    listingIdOrSlug: string,
  ): Promise<AvailabilityWindow[]> {
    const conductor = await this.assertConductor(actorUserId, listingIdOrSlug);
    return this.availability.getWindows(conductor.listingId);
  }

  /**
   * Owner / mediator sets the weekly availability for a listing.
   * `source`: `publish` | `edit` — drives analytics event name.
   */
  async setAvailability(
    actorUserId: string,
    listingIdOrSlug: string,
    windows: AvailabilityWindow[],
    source: 'publish' | 'edit' = 'publish',
  ): Promise<void> {
    const conductor = await this.assertConductor(actorUserId, listingIdOrSlug);
    await this.availability.setWindows(conductor.listingId, windows);
    const hours = weeklyHours(windows);
    if (source === 'edit') {
      this.analytics?.track(PRODUCT_EVENTS.LISTING_AVAILABILITY_EDITED, {
        listingId: conductor.listingId,
        windowCount: windows.length,
        weeklyHours: hours,
      });
    } else if (windows.length === 0) {
      this.analytics?.track(PRODUCT_EVENTS.LISTING_AVAILABILITY_SKIPPED, {
        listingId: conductor.listingId,
      });
    } else {
      this.analytics?.track(PRODUCT_EVENTS.LISTING_AVAILABILITY_SET, {
        listingId: conductor.listingId,
        windowCount: windows.length,
        weeklyHours: hours,
      });
    }
  }

  /** Bookable slots for a listing over a window (public — for seekers). */
  async slots(listingIdOrSlug: string, fromMs: number, toMs: number): Promise<Slot[]> {
    const meta = await this.listings.getConductor(listingIdOrSlug);
    if (!meta) throw new NotFoundException(`Listing ${listingIdOrSlug} not found`);
    const [windows, existing] = await Promise.all([
      this.availability.getWindows(meta.listingId),
      this.viewings.activeSlots(meta.listingId),
    ]);
    return generateSlots(windows, {
      fromMs,
      toMs,
      slotMinutes: this.cfg.slotMinutes,
      bufferMinutes: this.cfg.bufferMinutes,
      existing,
      nowMs: Date.now(),
      minLeadMinutes: this.cfg.minLeadMinutes,
      timeZone: meta.timezone || DEFAULT_LISTING_TIMEZONE,
    });
  }

  /** Seeker books a slot; validated server-side, then created REQUESTED. */
  async book(
    seekerUserId: string,
    listingIdOrSlug: string,
    input: { startMs: number; enquiryId?: string | null },
  ): Promise<Viewing> {
    const conductor = await this.listings.getConductor(listingIdOrSlug);
    if (!conductor) throw new NotFoundException(`Listing ${listingIdOrSlug} not found`);

    const request: Slot = {
      startMs: input.startMs,
      endMs: input.startMs + this.cfg.slotMinutes * 60_000,
    };
    const [windows, existing] = await Promise.all([
      this.availability.getWindows(conductor.listingId),
      this.viewings.activeSlots(conductor.listingId),
    ]);

    const decision = validateBooking(
      request,
      windows,
      existing,
      this.cfg,
      Date.now(),
      conductor.timezone || DEFAULT_LISTING_TIMEZONE,
    );
    if (!decision.ok) throw new ConflictException(decision.reason);

    const viewing = await this.viewings.create({
      listingId: conductor.listingId,
      seekerUserId,
      conductorUserId: conductor.conductorUserId,
      enquiryId: input.enquiryId ?? null,
      startMs: request.startMs,
      endMs: request.endMs,
    });
    this.analytics?.track(PRODUCT_EVENTS.VIEWING_REQUESTED, {
      listingId: conductor.listingId,
      viewingId: viewing.id,
      weeklyHours: weeklyHours(windows),
    });
    await this.notifier.notify(conductor.conductorUserId, viewing, 'requested');
    return this.enrich(viewing, seekerUserId);
  }

  async listMine(seekerUserId: string): Promise<Viewing[]> {
    const rows = await this.viewings.listForSeeker(seekerUserId);
    return Promise.all(rows.map((v) => this.enrich(v, seekerUserId)));
  }

  async listConducting(conductorUserId: string): Promise<Viewing[]> {
    const rows = await this.viewings.listForConductor(conductorUserId);
    return Promise.all(rows.map((v) => this.enrich(v, conductorUserId, { conductor: true })));
  }

  /** Confirm / cancel / complete / no-show. Seeker may cancel; conductor may do all. */
  async transition(actorUserId: string, viewingId: string, event: ViewingEvent): Promise<Viewing> {
    if (event === 'RESCHEDULE') {
      throw new ConflictException('Use POST /viewings/:id/reschedule with startMs');
    }
    const viewing = await this.viewings.get(viewingId);
    if (!viewing) throw new NotFoundException(`Viewing ${viewingId} not found`);

    const isConductor = viewing.conductorUserId === actorUserId;
    const isSeeker = viewing.seekerUserId === actorUserId;
    if (!isConductor && !(isSeeker && event === 'CANCEL')) {
      throw new ForbiddenException('Not permitted');
    }

    let status;
    try {
      status = nextViewingStatus(viewing.status, event);
    } catch (err) {
      if (err instanceof ViewingTransitionError) throw new ConflictException(err.message);
      throw err;
    }
    await this.viewings.setStatus(viewingId, status);
    const updated = { ...viewing, status };
    if (event === 'CONFIRM') await this.notifier.notify(viewing.seekerUserId, updated, 'confirmed');
    if (event === 'CANCEL') {
      const other =
        actorUserId === viewing.seekerUserId ? viewing.conductorUserId : viewing.seekerUserId;
      await this.notifier.notify(other, updated, 'cancelled');
    }
    return this.enrich(updated, actorUserId, { conductor: isConductor });
  }

  /**
   * Either party proposes a new slot. Preserves viewing id, bumps ICS SEQUENCE,
   * returns to REQUESTED. Same lead/buffer rules as book.
   */
  async reschedule(
    actorUserId: string,
    viewingId: string,
    startMs: number,
  ): Promise<Viewing> {
    const viewing = await this.viewings.get(viewingId);
    if (!viewing) throw new NotFoundException(`Viewing ${viewingId} not found`);
    const isConductor = viewing.conductorUserId === actorUserId;
    const isSeeker = viewing.seekerUserId === actorUserId;
    if (!isConductor && !isSeeker) throw new ForbiddenException('Not permitted');

    try {
      nextViewingStatus(viewing.status, 'RESCHEDULE');
    } catch (err) {
      if (err instanceof ViewingTransitionError) throw new ConflictException(err.message);
      throw err;
    }

    const meta = await this.listings.getConductor(viewing.listingId);
    if (!meta) throw new NotFoundException('Listing not found');

    const request: Slot = {
      startMs,
      endMs: startMs + this.cfg.slotMinutes * 60_000,
    };
    const [windows, existing] = await Promise.all([
      this.availability.getWindows(viewing.listingId),
      this.viewings.activeSlots(viewing.listingId, viewing.id),
    ]);
    const decision = validateBooking(
      request,
      windows,
      existing,
      this.cfg,
      Date.now(),
      meta.timezone || DEFAULT_LISTING_TIMEZONE,
    );
    if (!decision.ok) throw new ConflictException(decision.reason);

    const updated = await this.viewings.reschedule(viewing.id, request.startMs, request.endMs);
    const other = isSeeker ? viewing.conductorUserId : viewing.seekerUserId;
    await this.notifier.notify(other, updated, 'requested');
    return this.enrich(updated, actorUserId, { conductor: isConductor });
  }

  private async enrich(
    viewing: Viewing,
    viewerUserId: string,
    opts: { conductor?: boolean } = {},
  ): Promise<Viewing> {
    const meta = await this.listings.getConductor(viewing.listingId);
    if (!meta) return viewing;
    const areaLabel = [meta.city, meta.province].filter(Boolean).join(', ') || null;
    const isConductor = opts.conductor || viewing.conductorUserId === viewerUserId;
    const showAddress = isConductor || viewing.status === 'CONFIRMED';
    const out: Viewing = {
      ...viewing,
      timezone: meta.timezone || DEFAULT_LISTING_TIMEZONE,
      areaLabel,
      address: showAddress ? meta.address : null,
      listingTitle: meta.title,
    };
    return out;
  }

  private async assertConductor(
    actorUserId: string,
    listingIdOrSlug: string,
  ): Promise<{ listingId: string; conductorUserId: string; ownerUserId: string }> {
    const c = await this.listings.getConductor(listingIdOrSlug);
    if (!c) throw new NotFoundException(`Listing ${listingIdOrSlug} not found`);
    if (c.conductorUserId !== actorUserId && c.ownerUserId !== actorUserId) {
      throw new ForbiddenException('Not your listing');
    }
    return c;
  }
}
