import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings, properties } from '../db/schema';

@Injectable()
export class PropertiesService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async listForOwner(ownerId: string) {
    const rows = await this.db
      .select({
        id: properties.id,
        ownerId: properties.ownerId,
        listingId: properties.listingId,
        dealType: properties.dealType,
        status: properties.status,
        inCondominio: properties.inCondominio,
        title: properties.title,
        province: properties.province,
        listingTitle: listings.title,
        createdAt: properties.createdAt,
        updatedAt: properties.updatedAt,
      })
      .from(properties)
      .leftJoin(listings, eq(properties.listingId, listings.id))
      .where(eq(properties.ownerId, ownerId))
      .orderBy(desc(properties.updatedAt));

    return rows.map(({ listingTitle, ...p }) => ({
      ...p,
      title: p.title ?? listingTitle ?? null,
    }));
  }

  async get(id: string) {
    const rows = await this.db.select().from(properties).where(eq(properties.id, id)).limit(1);
    if (!rows[0]) throw new NotFoundException('property not found');
    return rows[0];
  }

  create(
    ownerId: string,
    input: { dealType: 'sale' | 'rent'; title?: string; inCondominio?: boolean },
  ) {
    return this.db
      .insert(properties)
      .values({
        ownerId,
        dealType: input.dealType,
        title: input.title,
        inCondominio: input.inCondominio ?? false,
        status: 'fascicolo_intake',
      })
      .returning();
  }
}
