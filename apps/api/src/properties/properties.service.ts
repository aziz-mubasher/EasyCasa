import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { properties } from '../db/schema';

@Injectable()
export class PropertiesService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  listForOwner(ownerId: string) {
    return this.db
      .select()
      .from(properties)
      .where(eq(properties.ownerId, ownerId))
      .orderBy(desc(properties.updatedAt));
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
