import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  Module,
} from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings, viewingAvailability, viewings } from '../db/schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersModule } from '../users/users.module';
import type {
  AvailabilityRepository,
  ViewingListingLookup,
  ViewingNotifier,
  ViewingRepository,
} from './domain/ports';
import type { AvailabilityWindow, Slot, Viewing, ViewingStatus } from './domain/types';
import { ViewingsController } from './viewings.controller';
import {
  AVAILABILITY_REPOSITORY,
  VIEWING_LISTING_LOOKUP,
  VIEWING_NOTIFIER,
  VIEWING_REPOSITORY,
  ViewingsService,
} from './viewings.service';

type ViewingRow = typeof viewings.$inferSelect;

function toViewing(r: ViewingRow): Viewing {
  return {
    id: r.id,
    listingId: r.listingId,
    seekerUserId: r.seekerUserId,
    conductorUserId: r.conductorUserId,
    enquiryId: r.enquiryId,
    startMs: r.startAt.getTime(),
    endMs: r.endAt.getTime(),
    status: r.status as ViewingStatus,
  };
}

@Injectable()
export class DrizzleAvailabilityRepository implements AvailabilityRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async getWindows(listingId: string): Promise<AvailabilityWindow[]> {
    const rows = await this.db
      .select({
        weekday: viewingAvailability.weekday,
        startMinutes: viewingAvailability.startMinutes,
        endMinutes: viewingAvailability.endMinutes,
      })
      .from(viewingAvailability)
      .where(eq(viewingAvailability.listingId, listingId));
    return rows.map((r) => ({
      weekday: r.weekday,
      startMinutes: r.startMinutes,
      endMinutes: r.endMinutes,
    }));
  }

  async setWindows(listingId: string, windows: AvailabilityWindow[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(viewingAvailability).where(eq(viewingAvailability.listingId, listingId));
      if (windows.length === 0) return;
      await tx.insert(viewingAvailability).values(
        windows.map((w) => ({
          listingId,
          weekday: w.weekday,
          startMinutes: w.startMinutes,
          endMinutes: w.endMinutes,
        })),
      );
    });
  }
}

@Injectable()
export class DrizzleViewingRepository implements ViewingRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async activeSlots(listingId: string): Promise<Slot[]> {
    const rows = await this.db
      .select({ startAt: viewings.startAt, endAt: viewings.endAt })
      .from(viewings)
      .where(
        and(
          eq(viewings.listingId, listingId),
          inArray(viewings.status, ['REQUESTED', 'CONFIRMED']),
        ),
      );
    return rows.map((r) => ({ startMs: r.startAt.getTime(), endMs: r.endAt.getTime() }));
  }

  async create(input: {
    listingId: string;
    seekerUserId: string;
    conductorUserId: string;
    enquiryId: string | null;
    startMs: number;
    endMs: number;
  }): Promise<Viewing> {
    try {
      const [r] = await this.db
        .insert(viewings)
        .values({
          listingId: input.listingId,
          seekerUserId: input.seekerUserId,
          conductorUserId: input.conductorUserId,
          enquiryId: input.enquiryId,
          startAt: new Date(input.startMs),
          endAt: new Date(input.endMs),
          status: 'REQUESTED',
        })
        .returning();
      return toViewing(r);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/unique|duplicate/i.test(msg)) {
        throw new ConflictException('Slot no longer available');
      }
      throw err;
    }
  }

  async get(id: string): Promise<Viewing | null> {
    const rows = await this.db.select().from(viewings).where(eq(viewings.id, id)).limit(1);
    return rows[0] ? toViewing(rows[0]) : null;
  }

  async listForSeeker(seekerUserId: string): Promise<Viewing[]> {
    const rows = await this.db
      .select()
      .from(viewings)
      .where(eq(viewings.seekerUserId, seekerUserId))
      .orderBy(asc(viewings.startAt));
    return rows.map(toViewing);
  }

  async listForConductor(conductorUserId: string): Promise<Viewing[]> {
    const rows = await this.db
      .select()
      .from(viewings)
      .where(eq(viewings.conductorUserId, conductorUserId))
      .orderBy(asc(viewings.startAt));
    return rows.map(toViewing);
  }

  async setStatus(id: string, status: ViewingStatus): Promise<void> {
    await this.db
      .update(viewings)
      .set({ status, updatedAt: new Date() })
      .where(eq(viewings.id, id));
  }
}

@Injectable()
export class DrizzleViewingListingLookup implements ViewingListingLookup {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async getConductor(
    listingId: string,
  ): Promise<{ conductorUserId: string; ownerUserId: string } | null> {
    const rows = await this.db
      .select({
        ownerUserId: listings.ownerUserId,
        mediatorUserId: listings.mediatorUserId,
        agentId: listings.agentId,
      })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    const ownerUserId = r.ownerUserId ?? r.agentId;
    if (!ownerUserId) return null;
    return {
      conductorUserId: r.mediatorUserId ?? ownerUserId,
      ownerUserId,
    };
  }
}

@Injectable()
export class DefaultViewingNotifier implements ViewingNotifier {
  private readonly logger = new Logger(DefaultViewingNotifier.name);

  constructor(private readonly notifications: NotificationsService) {}

  async notify(
    userId: string,
    viewing: Viewing,
    kind: 'requested' | 'confirmed' | 'cancelled',
  ): Promise<void> {
    try {
      await this.notifications.notify(
        userId,
        `viewing.${kind}`,
        {
          viewingId: viewing.id,
          listingId: viewing.listingId,
          startMs: viewing.startMs,
          status: viewing.status,
        },
        ['in_app', 'push'],
      );
    } catch (err) {
      this.logger.warn(
        `viewing notify failed user=${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

@Module({
  imports: [UsersModule, NotificationsModule],
  controllers: [ViewingsController],
  providers: [
    ViewingsService,
    { provide: AVAILABILITY_REPOSITORY, useClass: DrizzleAvailabilityRepository },
    { provide: VIEWING_REPOSITORY, useClass: DrizzleViewingRepository },
    { provide: VIEWING_LISTING_LOOKUP, useClass: DrizzleViewingListingLookup },
    { provide: VIEWING_NOTIFIER, useClass: DefaultViewingNotifier },
  ],
  exports: [ViewingsService],
})
export class ViewingsModule {}
