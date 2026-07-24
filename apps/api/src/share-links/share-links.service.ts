import {
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingsRepository } from '../listings/listings.repository';
import { loadApiConfig } from '../config/load';
import type { AuthUser } from '../auth/auth.types';
import type { AgentSnapshot } from './domain/public-payload';
import { buildPublicShareListing } from './domain/public-payload';
import { hashShareVisitor, newShareToken } from './domain/visitor-hash';
import { ShareLinksRepository } from './share-links.repository';

const AGENCY = {
  name: 'Easy Casa Italy',
  email: 'info@easycasaita.com',
  phone: null as string | null,
};

function canManageListing(
  listing: { agentId: string | null; ownerUserId: string | null },
  userId: string,
  user: AuthUser,
): boolean {
  if (user.roles.includes('admin')) return true;
  return listing.agentId === userId || listing.ownerUserId === userId;
}

function readAgentSnapshot(raw: unknown): AgentSnapshot {
  if (!raw || typeof raw !== 'object') {
    return { displayName: 'Easy Casa Italy' };
  }
  const o = raw as Record<string, unknown>;
  return {
    displayName: typeof o.displayName === 'string' ? o.displayName : 'Easy Casa Italy',
    phone: typeof o.phone === 'string' ? o.phone : null,
    slug: typeof o.slug === 'string' ? o.slug : null,
    bio: typeof o.bio === 'string' ? o.bio : null,
    avatarUrl: typeof o.avatarUrl === 'string' ? o.avatarUrl : null,
  };
}

@Injectable()
export class ShareLinksService {
  private viewPepper(): string {
    const cfg = loadApiConfig();
    return cfg.SHARE_VIEW_PEPPER.trim() || 'dev-share-view-pepper-change-me';
  }

  constructor(
    private readonly repo: ShareLinksRepository,
    private readonly listings: ListingsRepository,
  ) {}

  async create(
    listingId: string,
    userId: string,
    user: AuthUser,
    opts: { includeValuationBand?: boolean; includeSourcesTable?: boolean },
  ) {
    const listing = await this.repo.listingForShare(listingId);
    if (!listing) throw new NotFoundException('listing not found');
    if (!canManageListing(listing, userId, user)) {
      throw new ForbiddenException('not your listing');
    }
    if (listing.status !== 'published') {
      throw new ForbiddenException('listing must be published');
    }

    const agentUserId = listing.agentId ?? listing.ownerUserId ?? userId;
    const agentSnapshot = await this.repo.agentSnapshot(agentUserId);

    let token = newShareToken();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const row = await this.repo.insertLink({
          token,
          listingId,
          createdBy: userId,
          agentUserId,
          agentSnapshot,
          includeValuationBand: opts.includeValuationBand ?? true,
          includeSourcesTable: opts.includeSourcesTable ?? false,
        });
        return {
          id: row.id,
          token: row.token,
          listingId: row.listingId,
          includeValuationBand: row.includeValuationBand,
          includeSourcesTable: row.includeSourcesTable,
          viewCount: row.viewCount,
          uniqueViewCount: row.uniqueViewCount,
          lastViewedAt: row.lastViewedAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
          revokedAt: null,
          publicPath: `/s/${row.token}`,
        };
      } catch {
        if (attempt === 2) throw new Error('failed to allocate share token');
        token = newShareToken();
      }
    }
    throw new Error('unreachable');
  }

  async listMine(userId: string, listingId?: string) {
    const rows = await this.repo.listForUser(userId, listingId);
    return rows.map((row) => ({
      id: row.id,
      token: row.token,
      listingId: row.listingId,
      includeValuationBand: row.includeValuationBand,
      includeSourcesTable: row.includeSourcesTable,
      viewCount: row.viewCount,
      uniqueViewCount: row.uniqueViewCount,
      lastViewedAt: row.lastViewedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      publicPath: `/s/${row.token}`,
    }));
  }

  async revoke(linkId: string, userId: string, user: AuthUser) {
    const link = await this.repo.findById(linkId);
    if (!link) throw new NotFoundException('share link not found');
    if (link.createdBy !== userId && !user.roles.includes('admin')) {
      throw new ForbiddenException('not your share link');
    }
    const revoked = await this.repo.revoke(linkId, link.createdBy);
    if (!revoked) throw new NotFoundException('share link not found or already revoked');
    return { ok: true as const };
  }

  async getPublicPayload(token: string) {
    const link = await this.repo.findByToken(token);
    if (!link) throw new NotFoundException('share link not found');
    if (link.revokedAt) throw new GoneException('share link revoked');

    const listing = await this.repo.listingForShare(link.listingId);
    if (!listing || listing.status !== 'published') {
      throw new NotFoundException('listing not available');
    }

    const media = await this.listings.listMedia(listing.id);
    const agent = readAgentSnapshot(link.agentSnapshot);
    if (!agent.displayName) {
      Object.assign(
        agent,
        await this.repo.agentSnapshot(link.agentUserId ?? link.createdBy),
      );
    }

    return {
      token: link.token,
      includeValuationBand: link.includeValuationBand,
      viewCount: link.viewCount,
      uniqueViewCount: link.uniqueViewCount,
      agent,
      agency: AGENCY,
      listing: buildPublicShareListing(listing, media),
    };
  }

  async recordView(token: string, visitorToken: string) {
    if (!visitorToken || visitorToken.length < 8) {
      throw new ForbiddenException('invalid visitor token');
    }
    const link = await this.repo.findByToken(token);
    if (!link) throw new NotFoundException('share link not found');
    if (link.revokedAt) throw new GoneException('share link revoked');

    const visitorHash = hashShareVisitor({
      pepper: this.viewPepper(),
      shareLinkId: link.id,
      visitorToken,
    });
    await this.repo.recordView(link.id, visitorHash);

    const refreshed = await this.repo.findById(link.id);
    return {
      viewCount: refreshed?.viewCount ?? link.viewCount + 1,
      uniqueViewCount: refreshed?.uniqueViewCount ?? link.uniqueViewCount,
    };
  }
}
