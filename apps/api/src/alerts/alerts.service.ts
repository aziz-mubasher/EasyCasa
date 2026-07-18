import { Inject, Injectable, Logger } from '@nestjs/common';

import { listingMatchesSavedSearch, matchingListings } from './domain/match';
import { buildDigest, selectToNotify } from './domain/notify';
import {
  ALERT_LOG_REPOSITORY,
  LISTING_FEED,
  NOTIFICATION_SENDER,
  SAVED_SEARCH_REPOSITORY,
  type AlertLogRepository,
  type ListingFeed,
  type NotificationSender,
  type SavedSearchRepository,
} from './domain/ports';
import type { ListingPin } from './domain/types';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @Inject(SAVED_SEARCH_REPOSITORY) private readonly searches: SavedSearchRepository,
    @Inject(ALERT_LOG_REPOSITORY) private readonly log: AlertLogRepository,
    @Inject(LISTING_FEED) private readonly feed: ListingFeed,
    @Inject(NOTIFICATION_SENDER) private readonly sender: NotificationSender,
  ) {}

  /**
   * A new (or newly-matching) listing was published — notify every `instant`
   * saved search it matches, deduping against what each has already been
   * alerted about.
   */
  async onListingPublished(listing: ListingPin): Promise<void> {
    const searches = await this.searches.listByFrequency('instant');
    for (const ss of searches) {
      try {
        if (!listingMatchesSavedSearch(listing, ss.criteria)) continue;
        const already = await this.log.notifiedListingIds(ss.id);
        const toNotify = selectToNotify('instant', already, [listing.listingId]);
        if (toNotify.length === 0) continue;
        await this.sender.sendInstant(ss.userId, ss.name, listing);
        await this.log.record(ss.id, listing.listingId);
      } catch (err) {
        this.logger.warn(
          `instant alert failed for savedSearch=${ss.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /**
   * Scheduled digest run (e.g. daily). For each `daily` saved search, collect
   * the new listings since its last run that match, dedup, send one digest, and
   * advance the watermark.
   */
  async runDigests(nowIso: string = new Date().toISOString()): Promise<void> {
    const searches = await this.searches.listByFrequency('daily');
    for (const ss of searches) {
      try {
        const since = ss.lastRunAt ?? new Date(0).toISOString();
        const recent = await this.feed.since(since);
        const matches = matchingListings(recent, ss.criteria);

        const already = await this.log.notifiedListingIds(ss.id);
        const freshIds = selectToNotify(
          'daily',
          already,
          matches.map((m) => m.listingId),
        );
        const fresh = matches.filter((m) => freshIds.includes(m.listingId));

        if (fresh.length > 0) {
          await this.sender.sendDigest(ss.userId, buildDigest(ss, fresh));
          for (const m of fresh) await this.log.record(ss.id, m.listingId);
        }
        await this.searches.setLastRunAt(ss.id, nowIso);
      } catch (err) {
        this.logger.warn(
          `digest failed for savedSearch=${ss.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
