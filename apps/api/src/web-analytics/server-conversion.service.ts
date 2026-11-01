import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { isServerConversion, romeDay } from '@easycasa/shared';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { analyticsServerConversions } from '../db/schema';

@Injectable()
export class ServerConversionService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async bump(eventName: string): Promise<void> {
    if (!isServerConversion(eventName)) return;
    const day = romeDay();
    await this.db
      .insert(analyticsServerConversions)
      .values({ day, eventName, count: 1 })
      .onConflictDoUpdate({
        target: [analyticsServerConversions.day, analyticsServerConversions.eventName],
        set: { count: sql`${analyticsServerConversions.count} + 1` },
      });
  }
}
