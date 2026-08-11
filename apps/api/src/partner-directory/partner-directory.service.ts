import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
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
      })
      .from(partnerDirectory)
      .where(and(...filters))
      .orderBy(asc(partnerDirectory.province), asc(partnerDirectory.name));
    return {
      labelKey: 'partnerDirectory.informationalLabel',
      items: rows,
    };
  }

  async listAdmin() {
    return this.db
      .select()
      .from(partnerDirectory)
      .orderBy(asc(partnerDirectory.province), asc(partnerDirectory.name));
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
}
