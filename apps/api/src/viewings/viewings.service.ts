import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PRODUCT_EVENTS, weeklyHours } from '@easycasa/shared';

import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import { crmFireSafe } from '../crm/crm-fire-safe';
import { CRM_HOOKS, type CrmHooks } from '../crm/domain/ports';
import { generateSlots } from './domain/slots';
import {
  DEFAULT_CONFIG,
  VIEWING_CAPACITY_FULL_CODE,
  blockingSlotsFromOccupancy,
  canConfirmAgainstCapacity,
  validateBooking,
  windowCapacity,
  windowForSlot,
  type SchedulingConfig,
} from './domain/booking';
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
    @Optional() @Inject(CRM_HOOKS) private readonly crmHooks?: CrmHooks,
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
    const tz = meta.timezone || DEFAULT_LISTING_TIMEZONE;
    const [windows, occupancy] = await Promise.all([
      this.availability.getWindows(meta.listingId),
      this.viewings.activeOccupancy(meta.listingId),
    ]);
    const existing = blockingSlotsFromOccupancy(windows, occupancy, tz, this.cfg.slotMinutes);
    return generateSlots(windows, {
      fromMs,
      toMs,
      slotMinutes: this.cfg.slotMinutes,
      bufferMinutes: this.cfg.bufferMinutes,
      existing,
      nowMs: Date.now(),
      minLeadMinutes: this.cfg.minLeadMinutes,
      timeZone: tz,
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
    const tz = conductor.timezone || DEFAULT_LISTING_TIMEZONE;
    const [windows, occupancy] = await Promise.all([
      this.availability.getWindows(conductor.listingId),
      this.viewings.activeOccupancy(conductor.listingId),
    ]);
    const existing = blockingSlotsFromOccupancy(windows, occupancy, tz, this.cfg.slotMinutes);

    const decision = validateBooking(
      request,
      windows,
      existing,
      this.cfg,
      Date.now(),
      tz,
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
    const hooks = this.crmHooks;
    await crmFireSafe(
      'onViewingTransition',
      hooks
        ? () =>
            hooks.onViewingTransition(
              {
                viewingId: viewing.id,
                seekerUserId,
                enquiryId: viewing.enquiryId,
              },
              'viewing_requested',
            )
        : undefined,
    );
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
    return this.transitionInternal(actorUserId, viewingId, event, { mode: 'conductor' });
  }

  /**
   * EC-S-T21 — seller lifecycle on own listings (seller_profile checked by controller).
   * Authorizes via listing ownership, not conductorUserId equality.
   */
  async sellerTransition(
    actorUserId: string,
    viewingId: string,
    event: ViewingEvent,
  ): Promise<Viewing> {
    await this.assertSellerOwnsViewing(actorUserId, viewingId);
    return this.transitionInternal(actorUserId, viewingId, event, { mode: 'sellerOwner' });
  }

  /** EC-S-T21 — seller reschedule on own listing. */
  async sellerReschedule(
    actorUserId: string,
    viewingId: string,
    startMs: number,
  ): Promise<Viewing> {
    const viewing = await this.assertSellerOwnsViewing(actorUserId, viewingId);
    if (viewing.conductorUserId === actorUserId) {
      return this.reschedule(actorUserId, viewingId, startMs);
    }
    return this.rescheduleAsOwner(actorUserId, viewing, startMs);
  }

  private async rescheduleAsOwner(
    actorUserId: string,
    viewing: Viewing,
    startMs: number,
  ): Promise<Viewing> {
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
    const tz = meta.timezone || DEFAULT_LISTING_TIMEZONE;
    const [windows, occupancy] = await Promise.all([
      this.availability.getWindows(viewing.listingId),
      this.viewings.activeOccupancy(viewing.listingId, viewing.id),
    ]);
    const existing = blockingSlotsFromOccupancy(windows, occupancy, tz, this.cfg.slotMinutes);
    const decision = validateBooking(request, windows, existing, this.cfg, Date.now(), tz);
    if (!decision.ok) throw new ConflictException(decision.reason);
    const updated = await this.viewings.reschedule(viewing.id, request.startMs, request.endMs);
    await this.notifier.notify(viewing.seekerUserId, updated, 'requested');
    return this.enrich(updated, actorUserId, { conductor: true });
  }

  private async transitionInternal(
    actorUserId: string,
    viewingId: string,
    event: ViewingEvent,
    opts: { mode: 'conductor' | 'sellerOwner' },
  ): Promise<Viewing> {
    if (event === 'RESCHEDULE') {
      throw new ConflictException('Use POST /viewings/:id/reschedule with startMs');
    }
    const viewing = await this.viewings.get(viewingId);
    if (!viewing) throw new NotFoundException(`Viewing ${viewingId} not found`);

    const isConductor = viewing.conductorUserId === actorUserId;
    const isSeeker = viewing.seekerUserId === actorUserId;
    const authorized =
      opts.mode === 'sellerOwner' || isConductor || (isSeeker && event === 'CANCEL');
    if (!authorized) {
      throw new ForbiddenException('Not permitted');
    }

    if (event === 'CONFIRM') {
      await this.assertConfirmCapacity(viewing);
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
    if (event === 'CONFIRM') {
      await this.notifier.notify(viewing.seekerUserId, updated, 'confirmed');
      const hooks = this.crmHooks;
      await crmFireSafe(
        'onViewingTransition',
        hooks
          ? () =>
              hooks.onViewingTransition(
                {
                  viewingId: viewing.id,
                  seekerUserId: viewing.seekerUserId,
                  enquiryId: viewing.enquiryId,
                },
                'viewing_confirmed',
              )
          : undefined,
      );
    }
    if (event === 'COMPLETE') {
      const hooks = this.crmHooks;
      await crmFireSafe(
        'onViewingTransition',
        hooks
          ? () =>
              hooks.onViewingTransition(
                {
                  viewingId: viewing.id,
                  seekerUserId: viewing.seekerUserId,
                  enquiryId: viewing.enquiryId,
                },
                'viewing_done',
              )
          : undefined,
      );
    }
    if (event === 'CANCEL') {
      const other =
        actorUserId === viewing.seekerUserId ? viewing.conductorUserId : viewing.seekerUserId;
      await this.notifier.notify(other, updated, 'cancelled');
    }
    return this.enrich(updated, actorUserId, {
      conductor: isConductor || opts.mode === 'sellerOwner',
    });
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
    const tz = meta.timezone || DEFAULT_LISTING_TIMEZONE;
    const [windows, occupancy] = await Promise.all([
      this.availability.getWindows(viewing.listingId),
      this.viewings.activeOccupancy(viewing.listingId, viewing.id),
    ]);
    const existing = blockingSlotsFromOccupancy(windows, occupancy, tz, this.cfg.slotMinutes);
    const decision = validateBooking(
      request,
      windows,
      existing,
      this.cfg,
      Date.now(),
      tz,
    );
    if (!decision.ok) throw new ConflictException(decision.reason);

    const updated = await this.viewings.reschedule(viewing.id, request.startMs, request.endMs);
    const other = isSeeker ? viewing.conductorUserId : viewing.seekerUserId;
    await this.notifier.notify(other, updated, 'requested');
    return this.enrich(updated, actorUserId, { conductor: isConductor });
  }

  private async assertConfirmCapacity(viewing: Viewing): Promise<void> {
    const meta = await this.listings.getConductor(viewing.listingId);
    const tz = meta?.timezone || DEFAULT_LISTING_TIMEZONE;
    const windows = await this.availability.getWindows(viewing.listingId);
    const slot: Slot = { startMs: viewing.startMs, endMs: viewing.endMs };
    const capacity = windowCapacity(windowForSlot(slot, windows, tz));
    const confirmed = await this.viewings.countConfirmedAt(
      viewing.listingId,
      viewing.startMs,
      viewing.id,
    );
    if (!canConfirmAgainstCapacity(confirmed, capacity)) {
      throw new BadRequestException({
        message: 'This viewing slot is at capacity',
        code: VIEWING_CAPACITY_FULL_CODE,
      });
    }
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

  /**
   * EC-S-T21 — seller routes: listing ownership only (not mediator-as-conductor).
   * Caller must separately require a seller_profile row.
   */
  async assertSellerOwner(
    actorUserId: string,
    listingIdOrSlug: string,
  ): Promise<{ listingId: string; conductorUserId: string; ownerUserId: string }> {
    const c = await this.listings.getConductor(listingIdOrSlug);
    if (!c) throw new NotFoundException(`Listing ${listingIdOrSlug} not found`);
    if (c.ownerUserId !== actorUserId) {
      throw new ForbiddenException('Not your listing');
    }
    return c;
  }

  /** EC-S-T21 — seller must own the listing behind a viewing action. */
  async assertSellerOwnsViewing(
    actorUserId: string,
    viewingId: string,
  ): Promise<Viewing> {
    const viewing = await this.viewings.get(viewingId);
    if (!viewing) throw new NotFoundException(`Viewing ${viewingId} not found`);
    await this.assertSellerOwner(actorUserId, viewing.listingId);
    return viewing;
  }
}
