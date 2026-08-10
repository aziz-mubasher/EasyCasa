import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, eq, inArray, lte } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  VO_MODERATION_KINDS,
  matchOwnerName,
  transition,
  uploadOpen,
  type MatchVerdict,
  type VoActor,
  type VoEventType,
  type VoState,
  VoTransitionError,
} from '@easycasa/shared';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import {
  listings,
  moderationEvents,
  sellerProfile,
  verifiedOwnerCase,
} from '../db/schema';
import { MediaService, sniffVoDocMime } from '../media/media.service';
import { buildVoDocKey, isVoDocKeyForUser } from '../uploads/domain/keys';

const MAX_VO_DOC_BYTES = 15 * 1024 * 1024;

export type VoCaseView = {
  id: string;
  listingId: string;
  state: VoState;
  docKeys: string[];
  nameMatchVerdict: MatchVerdict | null;
  nameMatchScore: number | null;
  decisionReason: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  updatedAt: string;
};

@Injectable()
export class VerifiedOwnerService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
    private readonly media: MediaService,
  ) {}

  async getForSeller(sellerUserId: string, listingId: string): Promise<VoCaseView> {
    const row = await this.findCase(sellerUserId, listingId);
    if (!row) {
      return {
        id: '',
        listingId,
        state: 'none',
        docKeys: [],
        nameMatchVerdict: null,
        nameMatchScore: null,
        decisionReason: null,
        verifiedAt: null,
        expiresAt: null,
        updatedAt: new Date(0).toISOString(),
      };
    }
    return this.toView(row);
  }

  async submit(opts: {
    sellerUserId: string;
    listingId: string;
    intestatari: string[];
    files: Array<{ buffer: Buffer; originalname: string }>;
  }): Promise<VoCaseView> {
    const profile = await this.requireSellerProfile(opts.sellerUserId);
    await this.requireListing(opts.listingId);

    if (!opts.intestatari.length) {
      throw new BadRequestException('intestatari required');
    }
    if (!opts.files.length) {
      throw new BadRequestException('at least one document required');
    }

    const existing = await this.findCase(opts.sellerUserId, opts.listingId);
    const fromState: VoState = existing ? (existing.state as VoState) : 'none';
    if (!uploadOpen(fromState)) {
      throw new ConflictException(`cannot submit from state ${fromState}`);
    }

    let next: VoState;
    try {
      next = transition(fromState, { type: 'SUBMIT', actor: 'seller' });
    } catch (err) {
      if (err instanceof VoTransitionError) {
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }

    const caseId = existing?.id ?? randomUUID();
    const docKeys: string[] = [];
    for (const file of opts.files) {
      if (file.buffer.length > MAX_VO_DOC_BYTES) {
        throw new BadRequestException('document exceeds 15MB');
      }
      const mime = sniffVoDocMime(file.buffer);
      const key = buildVoDocKey(opts.sellerUserId, caseId, file.originalname, randomUUID());
      await this.media.putPrivateUserDoc(key, file.buffer, mime);
      docKeys.push(key);
    }

    const match = matchOwnerName(profile.displayName, opts.intestatari);

    if (existing) {
      // Best-effort delete previous docs on resubmit
      const prevKeys = Array.isArray(existing.docKeys) ? (existing.docKeys as string[]) : [];
      for (const k of prevKeys) {
        if (isVoDocKeyForUser(k, opts.sellerUserId)) {
          await this.media.deletePrivateUserDoc(k);
        }
      }
      const [updated] = await this.db
        .update(verifiedOwnerCase)
        .set({
          state: next,
          docKeys,
          nameMatchVerdict: match.verdict,
          nameMatchScore: String(match.score.toFixed(3)),
          decisionReason: null,
          decidedBy: null,
          verifiedAt: null,
          expiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(verifiedOwnerCase.id, existing.id))
        .returning();
      await this.appendEvent({
        kind: VO_MODERATION_KINDS.SUBMIT,
        listingId: opts.listingId,
        actorUserId: opts.sellerUserId,
        subjectUserId: opts.sellerUserId,
        detail: { caseId, verdict: match.verdict, score: match.score },
      });
      return this.toView(updated!);
    }

    const [created] = await this.db
      .insert(verifiedOwnerCase)
      .values({
        id: caseId,
        sellerUserId: opts.sellerUserId,
        listingId: opts.listingId,
        state: next,
        docKeys,
        nameMatchVerdict: match.verdict,
        nameMatchScore: String(match.score.toFixed(3)),
      })
      .returning();
    await this.appendEvent({
      kind: VO_MODERATION_KINDS.SUBMIT,
      listingId: opts.listingId,
      actorUserId: opts.sellerUserId,
      subjectUserId: opts.sellerUserId,
      detail: { caseId, verdict: match.verdict, score: match.score },
    });
    return this.toView(created!);
  }

  /** Admin / system transition wrapper — used by T15 and expire sweep. */
  async applyTransition(opts: {
    caseId: string;
    event: VoEventType;
    actor: VoActor;
    actorUserId: string | null;
    reason?: string;
  }): Promise<VoCaseView> {
    const rows = await this.db
      .select()
      .from(verifiedOwnerCase)
      .where(eq(verifiedOwnerCase.id, opts.caseId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('VO case not found');

    let next: VoState;
    try {
      next = transition(row.state as VoState, {
        type: opts.event,
        actor: opts.actor,
        reason: opts.reason,
      });
    } catch (err) {
      if (err instanceof VoTransitionError) {
        if (opts.event === 'CLAIM') throw new ConflictException(err.message);
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }

    const now = new Date();
    const patch: Partial<typeof verifiedOwnerCase.$inferInsert> = {
      state: next,
      updatedAt: now,
    };
    if (opts.event === 'VERIFY') {
      const months = this.config.VERIFIED_OWNER_VALIDITY_MONTHS;
      const expires = new Date(now);
      expires.setUTCMonth(expires.getUTCMonth() + months);
      patch.verifiedAt = now;
      patch.expiresAt = expires;
      patch.decidedBy = opts.actorUserId;
      patch.decisionReason = null;
    }
    if (opts.event === 'REJECT' || opts.event === 'REVOKE') {
      patch.decidedBy = opts.actorUserId;
      patch.decisionReason = opts.reason?.trim() ?? null;
      if (opts.event === 'REVOKE') {
        patch.expiresAt = null;
      }
    }
    if (opts.event === 'EXPIRE') {
      patch.expiresAt = now;
    }

    const [updated] = await this.db
      .update(verifiedOwnerCase)
      .set(patch)
      .where(eq(verifiedOwnerCase.id, opts.caseId))
      .returning();

    await this.appendEvent({
      kind: VO_MODERATION_KINDS[opts.event],
      listingId: row.listingId,
      actorUserId: opts.actorUserId,
      subjectUserId: row.sellerUserId,
      detail: { caseId: opts.caseId, reason: opts.reason ?? null },
    });

    return this.toView(updated!);
  }

  async listQueue(states: Array<'submitted' | 'in_review'>, limit = 50, offset = 0) {
    const rows = await this.db
      .select({
        case: verifiedOwnerCase,
        sellerDisplayName: sellerProfile.displayName,
      })
      .from(verifiedOwnerCase)
      .leftJoin(sellerProfile, eq(sellerProfile.userId, verifiedOwnerCase.sellerUserId))
      .where(inArray(verifiedOwnerCase.state, states))
      .orderBy(asc(verifiedOwnerCase.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map((r) => ({
      ...this.toView(r.case),
      sellerUserId: r.case.sellerUserId,
      sellerDisplayName: r.sellerDisplayName ?? null,
    }));
  }

  async getCaseDetail(caseId: string) {
    const rows = await this.db
      .select({
        case: verifiedOwnerCase,
        sellerDisplayName: sellerProfile.displayName,
        sellerPhone: sellerProfile.phone,
      })
      .from(verifiedOwnerCase)
      .leftJoin(sellerProfile, eq(sellerProfile.userId, verifiedOwnerCase.sellerUserId))
      .where(eq(verifiedOwnerCase.id, caseId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('VO case not found');
    return {
      ...this.toView(row.case),
      sellerUserId: row.case.sellerUserId,
      sellerDisplayName: row.sellerDisplayName ?? null,
      sellerPhone: row.sellerPhone ?? null,
      help:
        row.case.nameMatchVerdict === 'company'
          ? 'Richiede verifica manuale — intestatario societario (T05 §6.3: co-intestatari / terzi).'
          : row.case.nameMatchVerdict === 'partial'
            ? 'Match parziale — verificare manualmente (cognomi composti / coniugio).'
            : null,
    };
  }

  /** Nightly EXPIRE for verified cases past expires_at (DST-safe via UTC Date). */
  async expireDue(now = new Date()): Promise<number> {
    const due = await this.db
      .select({ id: verifiedOwnerCase.id })
      .from(verifiedOwnerCase)
      .where(
        and(
          eq(verifiedOwnerCase.state, 'verified'),
          lte(verifiedOwnerCase.expiresAt, now),
        ),
      );
    let n = 0;
    for (const row of due) {
      await this.applyTransition({
        caseId: row.id,
        event: 'EXPIRE',
        actor: 'system',
        actorUserId: null,
      });
      n += 1;
    }
    return n;
  }

  /** Erasure: delete VO objects and drop cases for subject. */
  async eraseForSubject(subjectUserId: string): Promise<{ erased: number; keys: number }> {
    const rows = await this.db
      .select()
      .from(verifiedOwnerCase)
      .where(eq(verifiedOwnerCase.sellerUserId, subjectUserId));
    let keys = 0;
    for (const row of rows) {
      const docs = Array.isArray(row.docKeys) ? (row.docKeys as string[]) : [];
      for (const k of docs) {
        await this.media.deletePrivateUserDoc(k);
        keys += 1;
      }
    }
    if (rows.length) {
      await this.db
        .delete(verifiedOwnerCase)
        .where(eq(verifiedOwnerCase.sellerUserId, subjectUserId));
    }
    return { erased: rows.length, keys };
  }

  private async appendEvent(opts: {
    kind: string;
    listingId: string;
    actorUserId: string | null;
    subjectUserId: string;
    detail: Record<string, unknown>;
  }): Promise<void> {
    await this.db.insert(moderationEvents).values({
      kind: opts.kind,
      listingId: opts.listingId,
      actorUserId: opts.actorUserId,
      subjectUserId: opts.subjectUserId,
      detail: opts.detail,
    });
  }

  private async findCase(sellerUserId: string, listingId: string) {
    const rows = await this.db
      .select()
      .from(verifiedOwnerCase)
      .where(
        and(
          eq(verifiedOwnerCase.sellerUserId, sellerUserId),
          eq(verifiedOwnerCase.listingId, listingId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  private async requireSellerProfile(userId: string) {
    const rows = await this.db
      .select()
      .from(sellerProfile)
      .where(eq(sellerProfile.userId, userId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('seller profile required');
    return row;
  }

  private async requireListing(listingId: string) {
    const rows = await this.db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('listing not found');
  }

  private toView(row: typeof verifiedOwnerCase.$inferSelect): VoCaseView {
    const docs = Array.isArray(row.docKeys) ? (row.docKeys as string[]) : [];
    const score =
      row.nameMatchScore == null || row.nameMatchScore === ''
        ? null
        : Number(row.nameMatchScore);
    return {
      id: row.id,
      listingId: row.listingId,
      state: row.state as VoState,
      docKeys: docs,
      nameMatchVerdict: (row.nameMatchVerdict as MatchVerdict | null) ?? null,
      nameMatchScore: Number.isFinite(score) ? score : null,
      decisionReason: row.decisionReason,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
