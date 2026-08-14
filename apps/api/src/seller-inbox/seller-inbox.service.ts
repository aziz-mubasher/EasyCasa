import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import {
  applyInbox,
  badgeDisplayState,
  perListingUnread,
  unreadCount,
  type EnquiryListItem,
  type InboxFilter,
  type InboxSort,
} from '@easycasa/shared';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { enquiries, listings, viewings } from '../db/schema';

@Injectable()
export class SellerInboxService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private async loadOwnerItems(ownerUserId: string): Promise<EnquiryListItem[]> {
    const rows = await this.db
      .select({
        id: enquiries.id,
        listingId: enquiries.listingId,
        listingTitle: listings.title,
        listingSlug: listings.slug,
        createdAt: enquiries.createdAt,
        readAt: enquiries.readAt,
        b4aStatus: enquiries.b4aStatus,
        b4aBandMaxCents: enquiries.b4aBandMaxCents,
        b4aExpiresAt: enquiries.b4aExpiresAt,
        b4aHolderInitials: enquiries.b4aHolderInitials,
        viewingId: viewings.id,
      })
      .from(enquiries)
      .innerJoin(listings, eq(enquiries.listingId, listings.id))
      .leftJoin(viewings, eq(viewings.enquiryId, enquiries.id))
      .where(eq(enquiries.ownerUserId, ownerUserId))
      .orderBy(desc(enquiries.createdAt));

    const byId = new Map<string, EnquiryListItem>();
    for (const r of rows) {
      const existing = byId.get(r.id);
      if (existing) {
        if (r.viewingId) existing.hasViewingRequest = true;
        continue;
      }
      let badge: EnquiryListItem['badge'] = null;
      if (
        r.b4aStatus &&
        r.b4aBandMaxCents != null &&
        r.b4aExpiresAt &&
        r.b4aHolderInitials
      ) {
        badge = {
          status: r.b4aStatus === 'revoked' ? 'revoked' : 'valid',
          bandMaxCents: r.b4aBandMaxCents,
          expiresAt: new Date(`${r.b4aExpiresAt}T23:59:59.999Z`),
          holderInitials: r.b4aHolderInitials,
        };
      }
      byId.set(r.id, {
        id: r.id,
        listingId: r.listingId,
        listingTitle: r.listingTitle,
        listingSlug: r.listingSlug,
        receivedAt: r.createdAt,
        read: r.readAt != null,
        badge,
        hasViewingRequest: Boolean(r.viewingId),
      });
    }
    return [...byId.values()];
  }

  async list(
    ownerUserId: string,
    filter: InboxFilter,
    sort: InboxSort,
    now = new Date(),
  ) {
    const items = await this.loadOwnerItems(ownerUserId);
    const filtered = applyInbox(items, filter, sort, now);
    return {
      items: filtered.map((i) => ({
        ...i,
        receivedAt: i.receivedAt.toISOString(),
        badgeDisplay: badgeDisplayState(i, now),
        badge: i.badge
          ? {
              status: i.badge.status,
              bandMaxCents: i.badge.bandMaxCents,
              expiresAt: i.badge.expiresAt.toISOString(),
              holderInitials: i.badge.holderInitials,
            }
          : null,
      })),
      unreadTotal: unreadCount(items),
      perListingUnread: Object.fromEntries(perListingUnread(items)),
    };
  }

  async markRead(ownerUserId: string, enquiryId: string) {
    const rows = await this.db
      .select({ id: enquiries.id, ownerUserId: enquiries.ownerUserId })
      .from(enquiries)
      .where(eq(enquiries.id, enquiryId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('enquiry not found');
    if (row.ownerUserId !== ownerUserId) throw new ForbiddenException('not your enquiry');
    await this.db
      .update(enquiries)
      .set({ readAt: new Date(), updatedAt: new Date() })
      .where(and(eq(enquiries.id, enquiryId), eq(enquiries.ownerUserId, ownerUserId)));
    return { id: enquiryId, read: true };
  }
}
