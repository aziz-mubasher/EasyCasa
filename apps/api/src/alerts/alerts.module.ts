import { Inject, Injectable, Logger, Module } from '@nestjs/common';
import { and, eq, gte, isNotNull } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { alertLogs, listings } from '../db/schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsService } from '../notifications/notifications.service';
import { SavedSearchesModule } from '../saved-searches/saved-searches.module';
import { AlertsService } from './alerts.service';
import {
  ALERT_LOG_REPOSITORY,
  LISTING_FEED,
  NOTIFICATION_SENDER,
  type AlertLogRepository,
  type ListingFeed,
  type NotificationSender,
} from './domain/ports';
import type { Digest, ListingPin } from './domain/types';
import { listingRowToPin } from './listing-pin';

@Injectable()
export class DrizzleAlertLogRepository implements AlertLogRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async notifiedListingIds(savedSearchId: string): Promise<string[]> {
    const rows = await this.db
      .select({ listingId: alertLogs.listingId })
      .from(alertLogs)
      .where(eq(alertLogs.savedSearchId, savedSearchId));
    return rows.map((r) => r.listingId);
  }

  async record(savedSearchId: string, listingId: string): Promise<void> {
    await this.db
      .insert(alertLogs)
      .values({ savedSearchId, listingId })
      .onConflictDoNothing({
        target: [alertLogs.savedSearchId, alertLogs.listingId],
      });
  }
}

@Injectable()
export class DrizzleListingFeed implements ListingFeed {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async since(iso: string): Promise<ListingPin[]> {
    const rows = await this.db
      .select({
        id: listings.id,
        title: listings.title,
        latitude: listings.latitude,
        longitude: listings.longitude,
        price: listings.price,
        transactionType: listings.transactionType,
        bedrooms: listings.bedrooms,
        rooms: listings.rooms,
        sizeSqm: listings.sizeSqm,
        energyClass: listings.energyClass,
        propertyType: listings.propertyType,
      })
      .from(listings)
      .where(
        and(
          eq(listings.status, 'published'),
          gte(listings.updatedAt, new Date(iso)),
          isNotNull(listings.latitude),
          isNotNull(listings.longitude),
        ),
      )
      .limit(500);

    const pins: ListingPin[] = [];
    for (const r of rows) {
      const pin = listingRowToPin(r);
      if (pin) pins.push(pin);
    }
    return pins;
  }
}

/**
 * Push + email dispatch seam. Writes an in-app notification and soft-fails
 * so one bad channel does not block the batch.
 */
@Injectable()
export class DefaultNotificationSender implements NotificationSender {
  private readonly logger = new Logger(DefaultNotificationSender.name);

  constructor(private readonly notifications: NotificationsService) {}

  async sendInstant(userId: string, savedSearchName: string, listing: ListingPin): Promise<void> {
    await this.dispatch(userId, 'saved_search.instant', {
      title: `New match · ${savedSearchName}`,
      body: listing.title,
      listingId: listing.listingId,
      savedSearchName,
    });
  }

  async sendDigest(userId: string, digest: Digest): Promise<void> {
    await this.dispatch(userId, 'saved_search.digest', {
      title: `${digest.total} new for “${digest.savedSearchName}”`,
      body: digest.items
        .map((i) => i.title)
        .slice(0, 3)
        .join(' · '),
      savedSearchId: digest.savedSearchId,
      total: digest.total,
      listingIds: digest.items.map((i) => i.listingId),
    });
  }

  private async dispatch(
    userId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.notifications.notify(userId, type, payload, ['in_app', 'push']);
    } catch (err) {
      this.logger.warn(
        `notify failed user=${userId} type=${type}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

@Module({
  imports: [SavedSearchesModule, NotificationsModule],
  providers: [
    AlertsService,
    { provide: ALERT_LOG_REPOSITORY, useClass: DrizzleAlertLogRepository },
    { provide: LISTING_FEED, useClass: DrizzleListingFeed },
    { provide: NOTIFICATION_SENDER, useClass: DefaultNotificationSender },
  ],
  exports: [AlertsService],
})
export class AlertsModule {}
