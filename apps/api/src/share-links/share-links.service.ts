import {
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { apiConfig } from '../config';
import { ListingsRepository } from '../listings/listings.repository';
import { ListingsService } from '../listings/listings.service';
import type { AuthUser } from '../auth/auth.types';
import { generateShareToken, normalizeOpaqueVisitorId, utcViewDate, visitorHashForView } from './domain/tokens';
import type {
  PublicListingPayload,
  ShareLinkOwnerRow,
  ShareLinkPublicPayload,
} from './domain/types';
import type { CreateShareLinkDto } from './dto/create-share-link.dto';
import { ShareLinksRepository } from './share-links.repository';

const PRIVATE_LISTING_KEYS = [
  'ownerUserId',
  'agentId',
  'mediatorUserId',
  'address',
  'postalCode',
  'foglio',
  'particella',
  'subalterno',
  'wpPostId',
  'qrCodeUrl',
] as const;

export { PRIVATE_LISTING_KEYS };

@Injectable()
export class ShareLinksService {
  constructor(
    private readonly repo: ShareLinksRepository,
    private readonly listingsRepo: ListingsRepository,
    private readonly listings: ListingsService,
  ) {}

  async create(dto: CreateShareLinkDto, userId: string, user: AuthUser) {
    await this.assertListingAccess(dto.listingId, userId, user);
    const listing = await this.listingsRepo.findById(dto.listingId);
    if (!listing) throw new NotFoundException('listing not found');
    if (listing.status !== 'published') {
      throw new ForbiddenException('listing must be published');
    }

    const agentSnapshot = await this.repo.agentSnapshotForUser(userId);
    let token = generateShareToken();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const row = await this.repo.insertLink({
          token,
          listingId: dto.listingId,
          createdBy: userId,
          agentSnapshot,
          includeValuationBand: dto.includeValuationBand ?? true,
        });
        return this.toOwnerRow(row, listing.title, listing.slug);
      } catch (e) {
        if (attempt === 2) throw e;
        token = generateShareToken();
      }
    }
    throw new Error('unreachable');
  }

  async listMine(userId: string): Promise<ShareLinkOwnerRow[]> {
    const rows = await this.repo.listForUser(userId);
    return rows.map((r) => ({
      id: r.id,
      token: r.token,
      listingId: r.listingId,
      listingTitle: r.listingTitle,
      listingSlug: r.listingSlug,
      includeValuationBand: r.includeValuationBand,
      viewCount: r.viewCount,
      uniqueViewCount: r.uniqueViewCount,
      lastViewedAt: r.lastViewedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      revokedAt: r.revokedAt?.toISOString() ?? null,
      publicPath: `/s/${r.token}`,
    }));
  }

  async revoke(linkId: string, userId: string) {
    const row = await this.repo.revoke(linkId, userId);
    if (!row) throw new NotFoundException('share link not found');
    return { id: row.id, revokedAt: row.revokedAt?.toISOString() ?? null };
  }

  async stats(linkId: string, userId: string, user: AuthUser) {
    const link = await this.repo.findById(linkId);
    if (!link || link.createdBy !== userId) throw new NotFoundException('share link not found');
    await this.assertListingAccess(link.listingId, userId, user);
    return {
      id: link.id,
      viewCount: link.viewCount,
      uniqueViewCount: link.uniqueViewCount,
      lastViewedAt: link.lastViewedAt?.toISOString() ?? null,
    };
  }

  async getPublicPayload(token: string, opaqueVisitorId: string | null): Promise<ShareLinkPublicPayload> {
    const link = await this.repo.findByToken(token);
    if (!link) throw new NotFoundException('share link not found');
    if (link.revokedAt) throw new GoneException('share link revoked');

    const listing = await this.listingsRepo.findById(link.listingId);
    if (!listing || listing.status !== 'published') {
      throw new NotFoundException('listing not available');
    }

    const viewDate = utcViewDate();
    const normalizedVisitor = normalizeOpaqueVisitorId(opaqueVisitorId);
    const visitorHash =
      normalizedVisitor != null
        ? visitorHashForView(
            apiConfig.SHARE_VIEW_HMAC_SECRET,
            link.id,
            viewDate,
            normalizedVisitor,
          )
        : null;

    const counts = await this.repo.recordView({
      shareLinkId: link.id,
      viewDate,
      visitorHash,
    });

    const media = await this.listingsRepo.listMedia(listing.id);
    const publicListing = this.toPublicListing(listing, media);

    let valuationBand: ShareLinkPublicPayload['valuationBand'];
    if (link.includeValuationBand && listing.slug) {
      valuationBand = await this.listings.getValuationBand(listing.slug);
    }

    const snapshot = link.agentSnapshot as ShareLinkPublicPayload['agent'];

    return {
      token: link.token,
      includeValuationBand: link.includeValuationBand,
      stats: {
        viewCount: counts.viewCount,
        uniqueViewCount: counts.uniqueViewCount,
      },
      agent: snapshot,
      agency: {
        name: apiConfig.AGENCY_PUBLIC_NAME,
        email: apiConfig.AGENCY_PUBLIC_EMAIL,
        phone: apiConfig.AGENCY_PUBLIC_PHONE || null,
      },
      listing: publicListing,
      valuationBand,
    };
  }

  /** Documented allow-list for tests — full listing row is never returned on SmartLink. */
  toPublicListing(
    listing: NonNullable<Awaited<ReturnType<ListingsRepository['findById']>>>,
    media: Awaited<ReturnType<ListingsRepository['listMedia']>>,
  ): PublicListingPayload {
    return {
      title: listing.title,
      city: listing.city ?? null,
      province: listing.province ?? null,
      transactionType: listing.transactionType ?? null,
      transactionTypes: listing.transactionTypes ?? [],
      price: listing.price != null ? Number(listing.price) : null,
      currency: listing.currency,
      bedrooms: listing.bedrooms ?? null,
      bathrooms: listing.bathrooms ?? null,
      rooms: listing.rooms ?? null,
      sizeSqm: listing.sizeSqm != null ? Number(listing.sizeSqm) : null,
      surfaceSqm: listing.surfaceSqm != null ? Number(listing.surfaceSqm) : null,
      yearBuilt: listing.yearBuilt ?? null,
      energyClass: listing.energyClass ?? null,
      features: listing.features ?? [],
      status: listing.status,
      media: media.map((m) => ({
        url: m.url,
        alt: m.alt,
        width: m.width,
        height: m.height,
        position: m.position,
      })),
      coverUrl: media[0]?.url ?? null,
    };
  }

  private async assertListingAccess(listingId: string, userId: string, user: AuthUser) {
    const listing = await this.listingsRepo.findById(listingId);
    if (!listing) throw new NotFoundException('listing not found');
    const isAdmin = user.roles.includes('admin');
    const isOwner = listing.agentId === userId || listing.ownerUserId === userId;
    if (!isAdmin && !isOwner) throw new ForbiddenException('not your listing');
  }

  private toOwnerRow(
    row: NonNullable<Awaited<ReturnType<ShareLinksRepository['insertLink']>>>,
    listingTitle: string,
    listingSlug: string | null,
  ): ShareLinkOwnerRow {
    return {
      id: row.id,
      token: row.token,
      listingId: row.listingId,
      listingTitle,
      listingSlug,
      includeValuationBand: row.includeValuationBand,
      viewCount: row.viewCount,
      uniqueViewCount: row.uniqueViewCount,
      lastViewedAt: row.lastViewedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      revokedAt: row.revokedAt?.toISOString() ?? null,
      publicPath: `/s/${row.token}`,
    };
  }
}
