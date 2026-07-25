import type { AuthUser } from '../../auth/auth.types';
import type { UserRole } from '@easycasa/shared';

/** Roles that may act on listings they do not own (must still be assigned on the listing). */
export const SMARTLINK_PRODUCT_ROLES = [
  'seller',
  'agent',
  'partner',
  'pro_marketer',
] as const satisfies readonly UserRole[];

export type ListingShareLinkParties = {
  ownerUserId: string | null;
  agentId: string | null;
  mediatorUserId: string | null;
};

export type ShareLinkAccessRow = {
  createdBy: string;
  listingId: string;
};

export function listingOwnerUserId(listing: ListingShareLinkParties): string | null {
  return listing.ownerUserId ?? listing.agentId;
}

export function isAssignedToListing(userId: string, listing: ListingShareLinkParties): boolean {
  const ownerId = listingOwnerUserId(listing);
  if (ownerId === userId) return true;
  if (listing.agentId === userId) return true;
  if (listing.mediatorUserId === userId) return true;
  return false;
}

export function isListingOwner(userId: string, listing: ListingShareLinkParties): boolean {
  const ownerId = listingOwnerUserId(listing);
  return ownerId != null && ownerId === userId;
}

export function hasSmartLinkProductRole(user: AuthUser): boolean {
  return user.roles.some((r) => (SMARTLINK_PRODUCT_ROLES as readonly string[]).includes(r));
}

/**
 * Create SmartLink: listing owner may create without a product realm role (low-friction seller).
 * Non-owners need a product role and an assignment on the listing.
 */
export function assertCanCreateShareLink(
  user: AuthUser,
  userId: string,
  listing: ListingShareLinkParties,
): void {
  if (user.roles.includes('admin')) return;

  const assigned = isAssignedToListing(userId, listing);
  if (isListingOwner(userId, listing)) return;

  if (!hasSmartLinkProductRole(user)) {
    throw new ShareLinkAuthError('insufficient role');
  }
  if (!assigned) {
    throw new ShareLinkAuthError('not authorized for this listing');
  }
}

export class ShareLinkAuthError extends Error {
  constructor(readonly code: 'insufficient role' | 'not authorized for this listing') {
    super(code);
    this.name = 'ShareLinkAuthError';
  }
}

export function canManageShareLink(
  user: AuthUser,
  userId: string,
  link: ShareLinkAccessRow,
  listing: ListingShareLinkParties,
): boolean {
  if (user.roles.includes('admin')) return true;
  if (link.createdBy === userId) return true;
  return isAssignedToListing(userId, listing);
}
