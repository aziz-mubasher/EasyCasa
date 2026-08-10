import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  canSubmit,
  deserializeDraft,
  DraftValidationError,
  type ListingDraftPayload,
  nextStep,
  prevStep,
  validateStep,
  type WizardStepId,
} from '@easycasa/shared';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listingDraft, sellerProfile } from '../db/schema';

/** EC-S-T07 — listing draft autosave (payload validated by listingWizard machine). */
@Injectable()
export class ListingDraftsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private async requireSeller(userId: string): Promise<void> {
    const rows = await this.db
      .select({ userId: sellerProfile.userId })
      .from(sellerProfile)
      .where(eq(sellerProfile.userId, userId))
      .limit(1);
    if (!rows[0]) {
      throw new BadRequestException('seller profile required');
    }
  }

  async create(userId: string): Promise<{ id: string; draft: ListingDraftPayload }> {
    await this.requireSeller(userId);
    const payload: ListingDraftPayload = { currentStep: 'basics' };
    const rows = await this.db
      .insert(listingDraft)
      .values({
        sellerId: userId,
        currentStep: payload.currentStep,
        payload,
        status: 'draft',
      })
      .returning();
    const row = rows[0]!;
    return { id: row.id, draft: payload };
  }

  async get(userId: string, draftId: string) {
    await this.requireSeller(userId);
    const rows = await this.db
      .select()
      .from(listingDraft)
      .where(and(eq(listingDraft.id, draftId), eq(listingDraft.sellerId, userId)))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('draft not found');
    return row;
  }

  async patch(userId: string, draftId: string, rawPayload: unknown) {
    await this.requireSeller(userId);
    let draft: ListingDraftPayload;
    try {
      draft = deserializeDraft(rawPayload);
    } catch (err) {
      if (err instanceof DraftValidationError) {
        throw new UnprocessableEntityException({
          message: 'malformed draft payload',
          codes: err.codes,
        });
      }
      throw new UnprocessableEntityException('malformed draft payload');
    }

    const existing = await this.get(userId, draftId);
    if (existing.status !== 'draft') {
      throw new BadRequestException('draft already submitted');
    }

    await this.db
      .update(listingDraft)
      .set({
        currentStep: draft.currentStep,
        payload: draft,
        updatedAt: new Date(),
      })
      .where(and(eq(listingDraft.id, draftId), eq(listingDraft.sellerId, userId)));

    return { id: draftId, draft };
  }

  async navigate(userId: string, draftId: string, direction: 'next' | 'prev') {
    const row = await this.get(userId, draftId);
    const draft = deserializeDraft(row.payload);
    if (direction === 'next') {
      const check = validateStep(draft.currentStep as WizardStepId, draft);
      if (!check.ok) {
        throw new UnprocessableEntityException({ message: 'step invalid', codes: check.codes });
      }
    }
    const moved = direction === 'next' ? nextStep(draft) : prevStep(draft);
    return this.patch(userId, draftId, moved);
  }

  async submit(userId: string, draftId: string) {
    const row = await this.get(userId, draftId);
    const draft = deserializeDraft(row.payload);
    if (!canSubmit(draft)) {
      throw new UnprocessableEntityException('draft not ready to submit');
    }
    await this.db
      .update(listingDraft)
      .set({ status: 'submitted', updatedAt: new Date() })
      .where(and(eq(listingDraft.id, draftId), eq(listingDraft.sellerId, userId)));
    return { id: draftId, status: 'submitted' as const, draft };
  }
}
