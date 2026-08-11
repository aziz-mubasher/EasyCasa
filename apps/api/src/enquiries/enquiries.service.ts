import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { crmFireSafe } from '../crm/crm-fire-safe';
import { CRM_HOOKS, type CrmHooks } from '../crm/domain/ports';
import { EmailService } from '../email/email.service';
import { assertEnquiryConsents } from '../privacy/enquiry-consent.gate';
import { ConsentService } from '../privacy/consent.service';
import { UsersService } from '../users/users.service';
import { BANKS4ALL_PORT, type Banks4AllPort } from './banks4all/banks4all.port';
import { enquiryForOwnerApi, enquiryForSeekerApi } from './banks4all/enquiry-api-view';
import { initialsMatch } from './banks4all/initials';
import { isExpiresOnOrAfterRomeToday } from './banks4all/rome-date';
import { extractBanks4AllTrackingToken, isPipPlanRefFormat } from './banks4all/token';
import type { Banks4AllAttachWarning } from './banks4all/types';
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

/** True when the cached attestation should still be shown to the owner (Europe/Rome). */
export function isBanks4AllBadgeVisible(enquiry: Enquiry, now = new Date()): boolean {
  if (enquiry.b4aBandMaxCents == null || !enquiry.b4aExpiresAt) {
    return false;
  }
  return isExpiresOnOrAfterRomeToday(enquiry.b4aExpiresAt, now);
}

@Injectable()
export class EnquiriesService {
  constructor(
    @Inject(ENQUIRY_REPOSITORY) private readonly repo: EnquiryRepository,
    @Inject(LISTING_LOOKUP) private readonly listings: ListingLookupPort,
    @Inject(ORDER_CREATION) private readonly orders: OrderCreationPort,
    @Inject(ENQUIRY_NOTIFIER) private readonly notifier: EnquiryNotifier,
    @Inject(BANKS4ALL_PORT) private readonly banks4all: Banks4AllPort,
    private readonly email: EmailService,
    private readonly users: UsersService,
    private readonly consent: ConsentService,
    @Optional() @Inject(CRM_HOOKS) private readonly crmHooks?: CrmHooks,
  ) {}

  /** Seeker submits interest on a listing → create enquiry + route notifications. */
  async create(
    seekerUserId: string,
    listingIdOrSlug: string,
    input: {
      intent: EnquiryIntent;
      message: string;
      contactEmail?: string | null;
      contactPhone?: string | null;
      contactWhatsappAvailable?: boolean;
      banks4AllTracking?: string | null;
    },
  ): Promise<Enquiry> {
    await assertEnquiryConsents(this.consent, seekerUserId);
    validateEnquiryInput(input);
    const parties = await this.listings.getParties(listingIdOrSlug);
    if (!parties) throw new NotFoundException(`Listing ${listingIdOrSlug} not found`);
    if (!parties.ownerUserId) {
      throw new ConflictException('Listing has no owner to route the enquiry to');
    }

    const contactPhone = input.contactPhone?.trim() || null;
    const contactWhatsappAvailable =
      Boolean(input.contactWhatsappAvailable) && contactPhone != null;

    const { fields: b4aFields, warning: b4aWarning } = await this.resolveBanks4AllAttestation(
      seekerUserId,
      input.banks4AllTracking,
    );

    const enquiry = await this.repo.create({
      listingId: parties.listingId,
      seekerUserId,
      ownerUserId: parties.ownerUserId,
      mediatorUserId: parties.mediatorUserId,
      intent: input.intent,
      message: input.message,
      contactEmail: input.contactEmail ?? null,
      contactPhone,
      contactWhatsappAvailable,
      ...b4aFields,
    });

    const routing = planEnquiryRouting(input.intent, parties);
    for (const userId of routing.notifyUserIds) {
      await this.notifier.notifyNewEnquiry(userId, enquiry);
    }

    await this.sendEnquiryEmails(enquiry, parties);

    const seeker = await this.users.findById(seekerUserId);
    const hooks = this.crmHooks;
    await crmFireSafe(
      'onEnquiryCreated',
      hooks
        ? () =>
            hooks.onEnquiryCreated({
              enquiryId: enquiry.id,
              seekerUserId,
              contactEmail: enquiry.contactEmail,
              contactPhone: enquiry.contactPhone,
              fullNameHint: seeker?.displayName ?? null,
              message: enquiry.message,
              hasB4a: enquiry.b4aBandMaxCents != null || enquiry.b4aToken != null,
              b4aBandMaxCents: enquiry.b4aBandMaxCents,
              b4aExpiresAt: enquiry.b4aExpiresAt ? new Date(enquiry.b4aExpiresAt) : null,
              b4aHolderInitials: seeker?.displayName
                ? seeker.displayName
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((p) => p[0]?.toUpperCase() ?? '')
                    .join('')
                    .slice(0, 4) || null
                : null,
            })
        : undefined,
    );

    const withWarn = b4aWarning ? { ...enquiry, b4aWarning } : enquiry;
    // Seeker create response: keep ephemeral warning; strip token/band from wire.
    return enquiryForSeekerApi(withWarn);
  }

  async listMine(seekerUserId: string): Promise<Enquiry[]> {
    const rows = await this.repo.listForSeeker(seekerUserId);
    return rows.map(enquiryForSeekerApi);
  }

  async listInbound(ownerUserId: string): Promise<Enquiry[]> {
    const rows = await this.repo.listForOwner(ownerUserId);
    return rows.map(enquiryForOwnerApi);
  }

  /** Owner / mediator advances the enquiry through its lifecycle. */
  async transition(actorUserId: string, id: string, event: EnquiryEvent): Promise<Enquiry> {
    if (event === 'CONVERT') {
      await this.convertToOrder(actorUserId, id);
      const updated = await this.repo.get(id);
      if (!updated) throw new NotFoundException(`Enquiry ${id} not found`);
      return enquiryForOwnerApi(updated);
    }
    const enquiry = await this.ownedByOwnerOrMediator(actorUserId, id);
    const status = nextEnquiryStatus(enquiry.status, event);
    await this.repo.setStatus(id, status);
    return enquiryForOwnerApi({ ...enquiry, status });
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

  /** Consent withdrawal for `b4a_affordability_share` — clear all four columns. */
  clearBanks4AllForSeeker(seekerUserId: string): Promise<number> {
    return this.repo.clearBanks4AllForSeeker(seekerUserId);
  }

  private async resolveBanks4AllAttestation(
    seekerUserId: string,
    rawTracking: string | null | undefined,
  ): Promise<{
    fields: {
      b4aToken: string | null;
      b4aBandMaxCents: number | null;
      b4aExpiresAt: string | null;
      b4aCheckedAt: Date | null;
      b4aHolderInitials: string | null;
      b4aStatus: 'valid' | 'revoked' | null;
    };
    warning: Banks4AllAttachWarning | null;
  }> {
    const empty = {
      fields: {
        b4aToken: null,
        b4aBandMaxCents: null,
        b4aExpiresAt: null,
        b4aCheckedAt: null,
        b4aHolderInitials: null,
        b4aStatus: null as 'valid' | 'revoked' | null,
      },
      warning: null as Banks4AllAttachWarning | null,
    };

    const extracted = extractBanks4AllTrackingToken(rawTracking);
    if (!extracted) return empty;

    if (isPipPlanRefFormat(extracted)) {
      return { ...empty, warning: 'plan_ref' };
    }

    const hasShareConsent = await this.consent.has(seekerUserId, 'b4a_affordability_share');
    if (!hasShareConsent) {
      return { ...empty, warning: 'consent_required' };
    }

    const outcome = await this.banks4all.verify(extracted);
    if (!outcome.ok) {
      return { ...empty, warning: 'unresolved' };
    }

    const seeker = await this.users.findById(seekerUserId);
    if (!initialsMatch(outcome.attestation.holderInitials, seeker?.displayName)) {
      return { ...empty, warning: 'initials_mismatch' };
    }

    return {
      fields: {
        b4aToken: extracted,
        b4aBandMaxCents: outcome.attestation.bandMaxCents,
        b4aExpiresAt: outcome.attestation.expiresAt,
        b4aCheckedAt: new Date(),
        b4aHolderInitials: outcome.attestation.holderInitials,
        b4aStatus: 'valid',
      },
      warning: null,
    };
  }

  private async sendEnquiryEmails(
    enquiry: Enquiry,
    parties: {
      title: string;
      slug: string;
      ownerUserId: string;
    },
  ): Promise<void> {
    const seeker = await this.users.findById(enquiry.seekerUserId);
    const owner = await this.users.findById(parties.ownerUserId);
    const seekerEmail = enquiry.contactEmail ?? seeker?.email;
    const seekerName = seeker?.displayName ?? seekerEmail?.split('@')[0] ?? 'Seeker';
    const listingUrl = `https://easycasaita.com/it/listings/${parties.slug}`;

    if (seekerEmail) {
      await this.email.enquiryReceivedSeeker(seekerEmail, {
        seekerName,
        listingTitle: parties.title,
        listingUrl,
      });
    }
    if (owner?.email) {
      await this.email.enquiryReceivedOwner(owner.email, {
        ownerName: owner.displayName ?? 'Agente',
        seekerName,
        seekerEmail: seekerEmail ?? '—',
        seekerPhone: enquiry.contactPhone,
        contactWhatsappAvailable: enquiry.contactWhatsappAvailable,
        listingTitle: parties.title,
        message: enquiry.message,
        b4aBandMaxCents: isBanks4AllBadgeVisible(enquiry) ? enquiry.b4aBandMaxCents : null,
        b4aExpiresAt: isBanks4AllBadgeVisible(enquiry) ? enquiry.b4aExpiresAt : null,
      });
    }
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
