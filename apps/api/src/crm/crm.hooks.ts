import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { CrmB4aAttestationStatus, CrmSeekerStage } from '@easycasa/shared';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { UsersService } from '../users/users.service';
import { CRM_REPOSITORY, type CrmHooks, type CrmRepository } from './domain/ports';

/**
 * In-process CRM side effects for enquiry/viewing/B4A.
 * No Nest EventEmitter exists in this repo — callers inject CRM_HOOKS optionally.
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

  async onEnquiryCreated(input: {
    enquiryId: string;
    seekerUserId: string;
    contactEmail: string | null;
    contactPhone: string | null;
    fullNameHint: string | null;
    message: string | null;
    hasB4a: boolean;
    b4aBandMaxCents: number | null;
    b4aExpiresAt: Date | null;
    b4aHolderInitials: string | null;
  }): Promise<void> {
    if (!this.enabled()) return;
    try {
      let contact = await this.repo.findContactByUserId(input.seekerUserId);
      if (!contact && input.contactEmail) {
        contact = await this.repo.findContactByEmail(input.contactEmail);
      }
      const user = this.users ? await this.users.findById(input.seekerUserId) : null;
      const fullName =
        input.fullNameHint?.trim() ||
        user?.displayName?.trim() ||
        input.contactEmail ||
        'Seeker';

      if (!contact) {
        contact = await this.repo.createContact({
          userId: input.seekerUserId,
          fullName,
          email: input.contactEmail,
          phone: input.contactPhone,
          source: 'enquiry',
        });
      } else {
        contact = await this.repo.updateContact(contact.id, {
          userId: contact.userId ?? input.seekerUserId,
          email: contact.email ?? input.contactEmail,
          phone: contact.phone ?? input.contactPhone,
          fullName: contact.fullName === 'Seeker' ? fullName : contact.fullName,
        });
      }

      const existingSeeker = await this.repo.getSeeker(contact.id);
      await this.repo.upsertSeeker(contact.id, {
        firstEnquiryId: existingSeeker?.firstEnquiryId ?? input.enquiryId,
        stage: existingSeeker?.stage ?? 'new_enquiry',
      });

      await this.repo.addActivity({
        contactId: contact.id,
        type: 'enquiry_ref',
        body: input.message?.slice(0, 500) || 'New enquiry',
        refTable: 'enquiries',
        refId: input.enquiryId,
      });

      if (input.hasB4a) {
        const status: CrmB4aAttestationStatus =
          input.b4aExpiresAt && input.b4aExpiresAt.getTime() < Date.now()
            ? 'expired'
            : input.b4aBandMaxCents != null
              ? 'active'
              : 'none';
        await this.repo.upsertB4a(contact.id, {
          attestationStatus: status,
          bandMaxCents: input.b4aBandMaxCents,
          attestationExpiresAt: input.b4aExpiresAt,
          holderInitials: input.b4aHolderInitials,
          lastSweepAt: new Date(),
        });
      }

      await this.repo.audit({
        actorAdminId: null,
        action: 'system_enquiry_upsert',
        entityType: 'crm_contact',
        entityId: contact.id,
        detail: { enquiryId: input.enquiryId },
      });
    } catch (err) {
      this.logger.warn(`CRM onEnquiryCreated failed: ${(err as Error).message}`);
    }
  }

  async onViewingLifecycle(input: {
    viewingId: string;
    seekerUserId: string;
    enquiryId: string | null;
    kind: 'requested' | 'confirmed' | 'completed';
  }): Promise<void> {
    if (!this.enabled()) return;
    try {
      let contact = await this.repo.findContactByUserId(input.seekerUserId);
      if (!contact) {
        contact = await this.repo.createContact({
          userId: input.seekerUserId,
          fullName: 'Seeker',
          source: 'enquiry',
        });
        await this.repo.upsertSeeker(contact.id, {
          firstEnquiryId: input.enquiryId,
          stage: 'new_enquiry',
        });
      }
      const stageMap: Record<typeof input.kind, CrmSeekerStage> = {
        requested: 'viewing_requested',
        confirmed: 'viewing_confirmed',
        completed: 'viewing_done',
      };
      const stage = stageMap[input.kind];
      await this.repo.setSeekerStage(contact.id, stage);
      await this.repo.addActivity({
        contactId: contact.id,
        type: 'viewing_ref',
        body: `Viewing ${input.kind}`,
        refTable: 'viewings',
        refId: input.viewingId,
      });
      await this.repo.addActivity({
        contactId: contact.id,
        type: 'stage_change',
        body: `Auto stage → ${stage} (viewing ${input.kind})`,
      });
      await this.repo.audit({
        actorAdminId: null,
        action: 'system_viewing_stage',
        entityType: 'crm_seeker',
        entityId: contact.id,
        detail: { viewingId: input.viewingId, kind: input.kind, stage },
      });
    } catch (err) {
      this.logger.warn(`CRM onViewingLifecycle failed: ${(err as Error).message}`);
    }
  }

  async onB4aSweepRow(input: {
    seekerUserId: string;
    status: CrmB4aAttestationStatus;
    bandMaxCents: number | null;
    expiresAt: Date | null;
    holderInitials: string | null;
  }): Promise<void> {
    if (!this.enabled()) return;
    try {
      const contact = await this.repo.findContactByUserId(input.seekerUserId);
      if (!contact) return;
      await this.repo.upsertB4a(contact.id, {
        attestationStatus: input.status,
        bandMaxCents: input.bandMaxCents,
        attestationExpiresAt: input.expiresAt,
        holderInitials: input.holderInitials,
        lastSweepAt: new Date(),
      });
    } catch (err) {
      this.logger.warn(`CRM onB4aSweepRow failed: ${(err as Error).message}`);
    }
  }
}
