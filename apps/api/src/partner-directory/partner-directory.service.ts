import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import {
  isPartnerDirectoryCategory,
  sanitizePartnerContact,
  type PartnerDirectoryCategory,
} from '@easycasa/shared';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { partnerDirectory } from '../db/schema';

export type PartnerDirectoryWrite = {
  category: string;
  name: string;
  province: string;
  credentials?: string | null;
  contact: string;
  active?: boolean;
  /** G3 row 9 — flat-fee labelled placement. */
  paidPlacement?: boolean;
  /** EasyCasa-operated pilot desk — not an independent third-party professional. */
  operatorManaged?: boolean;
};

@Injectable()
export class PartnerDirectoryService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private normalize(input: PartnerDirectoryWrite) {
    if (!isPartnerDirectoryCategory(input.category)) {
      throw new BadRequestException('invalid category');
    }
    const name = input.name.trim();
    const province = input.province.trim().toLowerCase();
    const contact = sanitizePartnerContact(input.contact);
    if (!name || !province || !contact) {
      throw new BadRequestException('name, province, and contact are required');
    }
    return {
      category: input.category as PartnerDirectoryCategory,
      name,
      province,
      credentials: input.credentials?.trim() || null,
      contact,
      active: input.active !== false,
      paidPlacement: input.paidPlacement === true,
      operatorManaged: input.operatorManaged === true,
    };
  }

  async listPublic(opts: { province?: string; category?: string }) {
    const filters = [eq(partnerDirectory.active, true)];
    if (opts.province?.trim()) {
      filters.push(eq(partnerDirectory.province, opts.province.trim().toLowerCase()));
    }
    if (opts.category?.trim()) {
      if (!isPartnerDirectoryCategory(opts.category.trim())) {
        throw new BadRequestException('invalid category');
      }
      filters.push(eq(partnerDirectory.category, opts.category.trim()));
    }
    const rows = await this.db
      .select({
        id: partnerDirectory.id,
        category: partnerDirectory.category,
        name: partnerDirectory.name,
        province: partnerDirectory.province,
        credentials: partnerDirectory.credentials,
        contact: partnerDirectory.contact,
        paidPlacement: partnerDirectory.paidPlacement,
        operatorManaged: partnerDirectory.operatorManaged,
      })
      .from(partnerDirectory)
      .where(and(...filters))
      .orderBy(
        desc(partnerDirectory.paidPlacement),
        asc(partnerDirectory.province),
        asc(partnerDirectory.name),
      );
    const anyPaid = rows.some((r) => r.paidPlacement);
    return {
      /** Page banner key — paid mix uses paidListingLabel; all-free keeps informational. */
      labelKey: anyPaid
        ? 'partnerDirectory.paidListingLabel'
        : 'partnerDirectory.informationalLabel',
      items: rows,
    };
  }

  async listAdmin() {
    return this.db
      .select()
      .from(partnerDirectory)
      .orderBy(
        desc(partnerDirectory.paidPlacement),
        asc(partnerDirectory.province),
        asc(partnerDirectory.name),
      );
  }

  async create(input: PartnerDirectoryWrite) {
    const values = this.normalize(input);
    const [row] = await this.db.insert(partnerDirectory).values(values).returning();
    return row;
  }

  async update(id: string, input: PartnerDirectoryWrite) {
    const values = this.normalize(input);
    const [row] = await this.db
      .update(partnerDirectory)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(partnerDirectory.id, id))
      .returning();
    if (!row) throw new NotFoundException('partner not found');
    return row;
  }

  async remove(id: string) {
    const [row] = await this.db
      .delete(partnerDirectory)
      .where(eq(partnerDirectory.id, id))
      .returning({ id: partnerDirectory.id });
    if (!row) throw new NotFoundException('partner not found');
    return { ok: true as const, id: row.id };
  }

  async findByUserId(userId: string) {
    const [row] = await this.db
      .select()
      .from(partnerDirectory)
      .where(eq(partnerDirectory.userId, userId))
      .limit(1);
    return row ?? null;
  }

  /** PP-1 — partner claims a directory row (one per user). */
  async apply(userId: string, input: PartnerDirectoryWrite) {
    const existing = await this.findByUserId(userId);
    if (existing) {
      throw new ConflictException('partner already has a directory listing');
    }
    const values = this.normalize(input);
    const [row] = await this.db
      .insert(partnerDirectory)
      .values({ ...values, userId, paidPlacement: false })
      .returning();
    return row;
  }

  async assertOwned(partnerDirectoryId: string, userId: string) {
    const [row] = await this.db
      .select()
      .from(partnerDirectory)
      .where(eq(partnerDirectory.id, partnerDirectoryId))
      .limit(1);
    if (!row || row.userId !== userId) {
      throw new NotFoundException('partner listing not found');
    }
    return row;
  }

  /** PP-1 — idempotent webhook activation (perpetual paid placement). */
  async activatePaidPlacement(partnerDirectoryId: string, paymentId: string) {
    const [row] = await this.db
      .select()
      .from(partnerDirectory)
      .where(eq(partnerDirectory.id, partnerDirectoryId))
      .limit(1);
    if (!row) return { activated: false as const, reason: 'not_found' as const };
    if (row.stripePaymentId === paymentId && row.paidPlacement) {
      return { activated: false as const, reason: 'already_paid' as const };
    }
    if (row.paidPlacement && row.stripePaymentId && row.stripePaymentId !== paymentId) {
      return { activated: false as const, reason: 'already_paid_other' as const };
    }
    await this.db
      .update(partnerDirectory)
      .set({
        paidPlacement: true,
        stripePaymentId: paymentId,
        updatedAt: new Date(),
      })
      .where(eq(partnerDirectory.id, partnerDirectoryId));
    return { activated: true as const, reason: 'activated' as const };
  }
}
