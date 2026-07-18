import type { RawListing, SimilarPin } from './types';

export interface ListingReadPort {
  getRaw(idOrSlug: string): Promise<RawListing | null>;
  findSimilar(anchor: {
    excludeId: string;
    provincia: string;
    dealType: RawListing['dealType'];
    type: RawListing['type'];
    priceCents: number;
    limit: number;
  }): Promise<SimilarPin[]>;
}

export const LISTING_READ = Symbol('LISTING_READ');
