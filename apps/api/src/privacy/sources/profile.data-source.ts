import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { devices, favorites, users } from '../../db/schema';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../personal-data-source';

@Injectable()
export class ProfileDataSource implements PersonalDataSource {
  readonly source = 'profile';

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async collect(subjectId: string): Promise<CollectedData> {
    const rows = await this.db.select().from(users).where(eq(users.id, subjectId)).limit(1);
    const u = rows[0];
    if (!u) return { source: this.source, records: [] };
    const favs = await this.db
      .select({ listingId: favorites.listingId, createdAt: favorites.createdAt })
      .from(favorites)
      .where(eq(favorites.userId, subjectId));
    return {
      source: this.source,
      records: [
        {
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          phone: u.phone,
          role: u.role,
          favorites: favs.map((f) => ({
            listingId: f.listingId,
            createdAt: f.createdAt.toISOString(),
          })),
        },
      ],
    };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    await this.db.delete(favorites).where(eq(favorites.userId, subjectId));
    await this.db.delete(devices).where(eq(devices.userId, subjectId));
    const updated = await this.db
      .update(users)
      .set({
        email: `erased-${subjectId}@anonymized.local`,
        displayName: '[anonymized]',
        phone: null,
        avatarUrl: null,
        bio: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, subjectId))
      .returning({ id: users.id });
    return {
      source: this.source,
      erased: updated.length,
      retainedUnderLegalHold: 0,
      note: 'account row kept with anonymized contact fields (FK integrity)',
    };
  }
}
