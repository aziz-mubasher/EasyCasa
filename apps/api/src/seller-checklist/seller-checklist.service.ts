import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  completenessPercent,
  emptyChecklistItems,
  isSellerChecklistTypeCode,
  scoreChecklist,
  type SellerChecklistItem,
  type SellerChecklistTypeCode,
  type SellerDocScore,
} from '@easycasa/shared';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings, sellerDocChecklist, sellerProfile } from '../db/schema';
import { MediaService, sniffVoDocMime } from '../media/media.service';
import { buildChecklistDocKey } from '../uploads/domain/keys';

const MAX_BYTES = 15 * 1024 * 1024;

@Injectable()
export class SellerChecklistService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly media: MediaService,
  ) {}

  /** Public DTO fragment — score only. */
  async publicScore(listingId: string): Promise<SellerDocScore | null> {
    const row = await this.findByListing(listingId);
    if (!row) return null;
    const items = this.parseItems(row.items);
    return scoreChecklist(items);
  }

  async getForSeller(sellerUserId: string, listingId: string) {
    await this.requireSeller(sellerUserId);
    await this.requireListing(listingId);
    let row = await this.findByListing(listingId);
    if (!row) {
      const items = emptyChecklistItems();
      const score = scoreChecklist(items);
      const [created] = await this.db
        .insert(sellerDocChecklist)
        .values({
          listingId,
          sellerUserId,
          items,
          completeness: completenessPercent(score),
        })
        .returning();
      row = created!;
    }
    if (row.sellerUserId !== sellerUserId) {
      throw new NotFoundException('checklist not found');
    }
    const items = this.parseItems(row.items);
    const score = scoreChecklist(items);
    return {
      listingId,
      items,
      score,
      completeness: row.completeness,
    };
  }

  async attachDoc(opts: {
    sellerUserId: string;
    listingId: string;
    typeCode: SellerChecklistTypeCode;
    file: { buffer: Buffer; originalname: string };
  }) {
    if (!isSellerChecklistTypeCode(opts.typeCode)) {
      throw new BadRequestException('invalid typeCode');
    }
    if (opts.file.buffer.length > MAX_BYTES) {
      throw new BadRequestException('document exceeds 15MB');
    }
    const current = await this.getForSeller(opts.sellerUserId, opts.listingId);
    const mime = sniffVoDocMime(opts.file.buffer);
    const key = buildChecklistDocKey(
      opts.sellerUserId,
      opts.listingId,
      opts.file.originalname,
      randomUUID(),
    );
    // Always MinIO — MediaService.putPrivateUserDoc never writes users/ to Bunny CDN.
    await this.media.putPrivateUserDoc(key, opts.file.buffer, mime);

    const prev = current.items.find((i) => i.typeCode === opts.typeCode);
    if (prev?.docKey) {
      await this.media.deletePrivateUserDoc(prev.docKey);
    }

    const items: SellerChecklistItem[] = current.items.map((i) =>
      i.typeCode === opts.typeCode
        ? { typeCode: i.typeCode, docKey: key, addedAt: new Date().toISOString() }
        : i,
    );
    const score = scoreChecklist(items);
    const [updated] = await this.db
      .update(sellerDocChecklist)
      .set({
        items,
        completeness: completenessPercent(score),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sellerDocChecklist.listingId, opts.listingId),
          eq(sellerDocChecklist.sellerUserId, opts.sellerUserId),
        ),
      )
      .returning();
    return {
      listingId: opts.listingId,
      items,
      score,
      completeness: updated?.completeness ?? completenessPercent(score),
    };
  }

  async removeDoc(opts: {
    sellerUserId: string;
    listingId: string;
    typeCode: SellerChecklistTypeCode;
  }) {
    if (!isSellerChecklistTypeCode(opts.typeCode)) {
      throw new BadRequestException('invalid typeCode');
    }
    const current = await this.getForSeller(opts.sellerUserId, opts.listingId);
    const prev = current.items.find((i) => i.typeCode === opts.typeCode);
    if (prev?.docKey) {
      await this.media.deletePrivateUserDoc(prev.docKey);
    }

    const items: SellerChecklistItem[] = current.items.map((i) =>
      i.typeCode === opts.typeCode
        ? { typeCode: i.typeCode, docKey: null, addedAt: null }
        : i,
    );
    const score = scoreChecklist(items);
    const [updated] = await this.db
      .update(sellerDocChecklist)
      .set({
        items,
        completeness: completenessPercent(score),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sellerDocChecklist.listingId, opts.listingId),
          eq(sellerDocChecklist.sellerUserId, opts.sellerUserId),
        ),
      )
      .returning();
    return {
      listingId: opts.listingId,
      items,
      score,
      completeness: updated?.completeness ?? completenessPercent(score),
    };
  }

  async eraseForSubject(subjectUserId: string): Promise<{ erased: number; keys: number }> {
    const rows = await this.db
      .select()
      .from(sellerDocChecklist)
      .where(eq(sellerDocChecklist.sellerUserId, subjectUserId));
    let keys = 0;
    for (const row of rows) {
      for (const item of this.parseItems(row.items)) {
        if (item.docKey) {
          await this.media.deletePrivateUserDoc(item.docKey);
          keys += 1;
        }
      }
    }
    if (rows.length) {
      await this.db
        .delete(sellerDocChecklist)
        .where(eq(sellerDocChecklist.sellerUserId, subjectUserId));
    }
    return { erased: rows.length, keys };
  }

  private parseItems(raw: unknown): SellerChecklistItem[] {
    if (!Array.isArray(raw) || raw.length === 0) return emptyChecklistItems();
    const byCode = new Map<string, SellerChecklistItem>();
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue;
      const e = entry as Record<string, unknown>;
      if (!isSellerChecklistTypeCode(e.typeCode)) continue;
      byCode.set(e.typeCode, {
        typeCode: e.typeCode,
        docKey: typeof e.docKey === 'string' ? e.docKey : null,
        addedAt: typeof e.addedAt === 'string' ? e.addedAt : null,
      });
    }
    return emptyChecklistItems().map((blank) => byCode.get(blank.typeCode) ?? blank);
  }

  private async findByListing(listingId: string) {
    const rows = await this.db
      .select()
      .from(sellerDocChecklist)
      .where(eq(sellerDocChecklist.listingId, listingId))
      .limit(1);
    return rows[0] ?? null;
  }

  private async requireSeller(userId: string) {
    const rows = await this.db
      .select({ userId: sellerProfile.userId })
      .from(sellerProfile)
      .where(eq(sellerProfile.userId, userId))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('seller profile required');
  }

  private async requireListing(listingId: string) {
    const rows = await this.db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('listing not found');
  }
}
