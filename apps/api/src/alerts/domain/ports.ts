import type {
  AlertFrequency,
  Digest,
  ListingPin,
  SavedSearch,
  SavedSearchCriteria,
} from './types';

export interface SavedSearchRepository {
  create(input: {
    userId: string;
    name: string;
    criteria: SavedSearchCriteria;
    frequency: AlertFrequency;
  }): Promise<SavedSearch>;
  listForUser(userId: string): Promise<SavedSearch[]>;
  get(id: string): Promise<SavedSearch | null>;
  listByFrequency(frequency: AlertFrequency): Promise<SavedSearch[]>;
  setFrequency(id: string, frequency: AlertFrequency): Promise<void>;
  setLastRunAt(id: string, iso: string): Promise<void>;
  remove(id: string, userId: string): Promise<void>;
}

export interface AlertLogRepository {
  notifiedListingIds(savedSearchId: string): Promise<string[]>;
  record(savedSearchId: string, listingId: string): Promise<void>;
}

export interface ListingFeed {
  since(iso: string): Promise<ListingPin[]>;
}

export interface NotificationSender {
  sendInstant(userId: string, savedSearchName: string, listing: ListingPin): Promise<void>;
  sendDigest(userId: string, digest: Digest): Promise<void>;
}

export const SAVED_SEARCH_REPOSITORY = Symbol('SAVED_SEARCH_REPOSITORY');
export const ALERT_LOG_REPOSITORY = Symbol('ALERT_LOG_REPOSITORY');
export const LISTING_FEED = Symbol('LISTING_FEED');
export const NOTIFICATION_SENDER = Symbol('NOTIFICATION_SENDER');
