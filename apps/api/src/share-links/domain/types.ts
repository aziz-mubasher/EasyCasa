import type { ValuationBandResponse } from '../../avm/domain/valuation-band';

export interface AgentSnapshot {
  displayName: string | null;
  phone: string | null;
  bio: string | null;
  slug: string | null;
}

export interface AgencyPublicBlock {
  name: string;
  email: string;
  phone: string | null;
}

export interface PublicListingMedia {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  position: number;
}

/** Fields intentionally exposed on SmartLink — no owner ids, cadastral, or street address. */
export interface PublicListingPayload {
  title: string;
  city: string | null;
  province: string | null;
  transactionType: string | null;
  transactionTypes: string[];
  price: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  rooms: number | null;
  sizeSqm: number | null;
  surfaceSqm: number | null;
  yearBuilt: number | null;
  energyClass: string | null;
  features: string[];
  status: string;
  media: PublicListingMedia[];
  coverUrl: string | null;
}

export interface ShareLinkPublicPayload {
  token: string;
  includeValuationBand: boolean;
  stats: {
    viewCount: number;
    uniqueViewCount: number;
  };
  agent: AgentSnapshot;
  agency: AgencyPublicBlock;
  listing: PublicListingPayload;
  valuationBand?: ValuationBandResponse;
}

export interface ShareLinkOwnerRow {
  id: string;
  token: string;
  listingId: string;
  listingTitle: string;
  listingSlug: string | null;
  includeValuationBand: boolean;
  viewCount: number;
  uniqueViewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  publicPath: string;
}
