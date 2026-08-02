import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { CrmB4aAttestationStatus } from '@easycasa/shared';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { UsersService } from '../users/users.service';
import {
  CRM_REPOSITORY,
  type CrmB4aSweepRow,
  type CrmEnquiryRef,
  type CrmHooks,
  type CrmRepository,
  type CrmViewingHookStage,
  type CrmViewingRef,
} from './domain/ports';

/**
 * §8 CRM_HOOKS implementation — enquiry / viewing / B4A sweep.
 * Fire-safe: every method swallows errors (host flow must never fail).
 */
@Injectable()
export class CrmHooksService implements CrmHooks {
  private readonly logger = new Logger(CrmHooksService.name);

  constructor(
    @Inject(CRM_REPOSITORY) private readonly repo: CrmRepository,
    @InjectConfig() private readonly config: ApiConfig,
    @Optional() private readonly users?: UsersService,
  ) {}

  private enabled(): boolean {
    return this.config.CRM_ENABLED === true;
  }

  async onEnquiryCreated(e: CrmEnquiryRef): Promise<void> {
    if (!this.enabled()) return;
    try {
      let contact = await this.repo.findContactByUserId(e.seekerUserId);
      if (!contact && e.contactEmail) {
        contact = await this.repo.findContactByEmail(e.contactEmail);
      }
      const user = this.users ? await this.users.findById(e.seekerUserId) : null;
      const fullName =
        e.fullNameHint?.trim() ||
        user?.displayName?.trim() ||
        e.contactEmail ||
        'Seeker';

      const marketingConsentId = await this.repo.findLatestMarketingConsentId(e.seekerUserId);

      if (!contact) {
        contact = await this.repo.createContact({
          userId: e.seekerUserId,
          fullName,
          email: e.contactEmail,
          phone: e.contactPhone,
          source: 'enquiry',
          marketingConsentId,
        });
      } else {
        contact = await this.repo.updateContact(contact.id, {
          userId: contact.userId ?? e.seekerUserId,
          email: contact.email ?? e.contactEmail,
          phone: contact.phone ?? e.contactPhone,
          fullName: contact.fullName === 'Seeker' ? fullName : contact.fullName,
          marketingConsentId: contact.marketingConsentId ?? marketingConsentId,
        });
      }

      const existingSeeker = await this.repo.getSeeker(contact.id);
      await this.repo.upsertSeeker(contact.id, {
        firstEnquiryId: existingSeeker?.firstEnquiryId ?? e.enquiryId,
        stage: existingSeeker?.stage ?? 'new_enquiry',
      });

      await this.repo.addActivity({
        contactId: contact.id,
        type: 'enquiry_ref',
        body: e.message?.slice(0, 500) || 'New enquiry',
        refTable: 'enquiries',
        refId: e.enquiryId,
      });

      if (e.hasB4a) {
        const status: CrmB4aAttestationStatus =
          e.b4aExpiresAt && e.b4aExpiresAt.getTime() < Date.now()
            ? 'expired'
            : e.b4aBandMaxCents != null
              ? 'active'
              : 'none';
        await this.repo.upsertB4a(contact.id, {
          attestationStatus: status,
          bandMaxCents: e.b4aBandMaxCents,
          attestationExpiresAt: e.b4aExpiresAt,
          holderInitials: e.b4aHolderInitials,
          lastSweepAt: new Date(),
        });
      }

      await this.repo.audit({
        actorAdminId: null,
        action: 'system_enquiry_upsert',
        entityType: 'crm_contact',
        entityId: contact.id,
        detail: { enquiryId: e.enquiryId, marketingConsentId },
      });
    } catch (err) {
      this.logger.warn(`CRM onEnquiryCreated failed: ${(err as Error).message}`);
    }
  }

  async onViewingTransition(v: CrmViewingRef, to: CrmViewingHookStage): Promise<void> {
    if (!this.enabled()) return;
    try {
      let contact = await this.repo.findContactByUserId(v.seekerUserId);
      if (!contact) {
        contact = await this.repo.createContact({
          userId: v.seekerUserId,
          fullName: 'Seeker',
          source: 'enquiry',
        });
        await this.repo.upsertSeeker(contact.id, {
          firstEnquiryId: v.enquiryId,
          stage: 'new_enquiry',
        });
      }
      await this.repo.setSeekerStage(contact.id, to);
      await this.repo.addActivity({
        contactId: contact.id,
        type: 'viewing_ref',
        body: `Viewing → ${to}`,
        refTable: 'viewings',
        refId: v.viewingId,
      });
      await this.repo.addActivity({
        contactId: contact.id,
        type: 'stage_change',
        body: `Auto stage → ${to}`,
      });
      await this.repo.audit({
        actorAdminId: null,
        action: 'system_viewing_stage',
        entityType: 'crm_seeker',
        entityId: contact.id,
        detail: { viewingId: v.viewingId, to },
      });
    } catch (err) {
      this.logger.warn(`CRM onViewingTransition failed: ${(err as Error).message}`);
    }
  }

  async onB4aSweepResult(r: CrmB4aSweepRow): Promise<void> {
    if (!this.enabled()) return;
    try {
      const contact = await this.repo.findContactByUserId(r.seekerUserId);
      if (!contact) return;
      await this.repo.upsertB4a(contact.id, {
        attestationStatus: r.status,
        bandMaxCents: r.bandMaxCents,
        attestationExpiresAt: r.expiresAt,
        holderInitials: r.holderInitials,
        lastSweepAt: new Date(),
      });
    } catch (err) {
      this.logger.warn(`CRM onB4aSweepResult failed: ${(err as Error).message}`);
    }
  }
}
