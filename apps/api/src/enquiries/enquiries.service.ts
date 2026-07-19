import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  buildOrderDraftFromEnquiry,
  canConvertToOrder,
  planEnquiryRouting,
} from './domain/routing';
import {
  ENQUIRY_NOTIFIER,
  ENQUIRY_REPOSITORY,
  LISTING_LOOKUP,
  ORDER_CREATION,
  type EnquiryNotifier,
  type EnquiryRepository,
  type ListingLookupPort,
  type OrderCreationPort,
} from './domain/ports';
import { nextEnquiryStatus, validateEnquiryInput } from './domain/state';
import type { Enquiry, EnquiryEvent, EnquiryIntent } from './domain/types';

@Injectable()
export class EnquiriesService {
  constructor(
    @Inject(ENQUIRY_REPOSITORY) private readonly repo: EnquiryRepository,
    @Inject(LISTING_LOOKUP) private readonly listings: ListingLookupPort,
    @Inject(ORDER_CREATION) private readonly orders: OrderCreationPort,
    @Inject(ENQUIRY_NOTIFIER) private readonly notifier: EnquiryNotifier,
  ) {}

  /** Seeker submits interest on a listing → create enquiry + route notifications. */
  async create(
    seekerUserId: string,
    listingId: string,
    input: {
      intent: EnquiryIntent;
      message: string;
      contactEmail?: string | null;
      contactPhone?: string | null;
    },
  ): Promise<Enquiry> {
    validateEnquiryInput(input);
    const parties = await this.listings.getParties(listingId);
    if (!parties) throw new NotFoundException(`Listing ${listingId} not found`);
    if (!parties.ownerUserId) {
      throw new ConflictException('Listing has no owner to route the enquiry to');
    }

    const enquiry = await this.repo.create({
      listingId,
      seekerUserId,
      ownerUserId: parties.ownerUserId,
      mediatorUserId: parties.mediatorUserId,
      intent: input.intent,
      message: input.message,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
    });

    const routing = planEnquiryRouting(input.intent, parties);
    for (const userId of routing.notifyUserIds) {
      await this.notifier.notifyNewEnquiry(userId, enquiry);
    }
    return enquiry;
  }

  listMine(seekerUserId: string): Promise<Enquiry[]> {
    return this.repo.listForSeeker(seekerUserId);
  }

  listInbound(ownerUserId: string): Promise<Enquiry[]> {
    return this.repo.listForOwner(ownerUserId);
  }

  /** Owner / mediator advances the enquiry through its lifecycle. */
  async transition(actorUserId: string, id: string, event: EnquiryEvent): Promise<Enquiry> {
    if (event === 'CONVERT') {
      await this.convertToOrder(actorUserId, id);
      const updated = await this.repo.get(id);
      if (!updated) throw new NotFoundException(`Enquiry ${id} not found`);
      return updated;
    }
    const enquiry = await this.ownedByOwnerOrMediator(actorUserId, id);
    const status = nextEnquiryStatus(enquiry.status, event);
    await this.repo.setStatus(id, status);
    return { ...enquiry, status };
  }

  /** Convert a qualified enquiry into an order in the Phase 10 pipeline. */
  async convertToOrder(
    actorUserId: string,
    id: string,
  ): Promise<{ enquiryId: string; orderId: string }> {
    const enquiry = await this.ownedByOwnerOrMediator(actorUserId, id);
    const decision = canConvertToOrder(enquiry);
    if (!decision.ok) throw new ConflictException(decision.reason);

    // Validate lifecycle step (QUALIFIED → CONVERTED).
    nextEnquiryStatus(enquiry.status, 'CONVERT');

    const draft = buildOrderDraftFromEnquiry(enquiry);
    const { orderId } = await this.orders.createFromDraft(draft);
    await this.repo.setOrder(id, orderId, 'CONVERTED');
    return { enquiryId: id, orderId };
  }

  private async ownedByOwnerOrMediator(actorUserId: string, id: string): Promise<Enquiry> {
    const enquiry = await this.repo.get(id);
    if (!enquiry) throw new NotFoundException(`Enquiry ${id} not found`);
    if (enquiry.ownerUserId !== actorUserId && enquiry.mediatorUserId !== actorUserId) {
      throw new ForbiddenException('Not your enquiry to manage');
    }
    return enquiry;
  }
}
