import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

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
  ) {}

  /** Owner / mediator sets the weekly availability for a listing. */
  async setAvailability(
    actorUserId: string,
    listingIdOrSlug: string,
    windows: AvailabilityWindow[],
  ): Promise<void> {
    const conductor = await this.assertConductor(actorUserId, listingIdOrSlug);
    await this.availability.setWindows(conductor.listingId, windows);
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

    const decision = validateBooking(request, windows, existing, this.cfg, Date.now());
    if (!decision.ok) throw new ConflictException(decision.reason);

    const viewing = await this.viewings.create({
      listingId: conductor.listingId,
      seekerUserId,
      conductorUserId: conductor.conductorUserId,
      enquiryId: input.enquiryId ?? null,
      startMs: request.startMs,
      endMs: request.endMs,
    });
    await this.notifier.notify(conductor.conductorUserId, viewing, 'requested');
    return viewing;
  }

  listMine(seekerUserId: string): Promise<Viewing[]> {
    return this.viewings.listForSeeker(seekerUserId);
  }

  listConducting(conductorUserId: string): Promise<Viewing[]> {
    return this.viewings.listForConductor(conductorUserId);
  }

  /** Confirm / cancel / complete / no-show. Seeker may cancel; conductor may do all. */
  async transition(actorUserId: string, viewingId: string, event: ViewingEvent): Promise<Viewing> {
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
    return updated;
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
