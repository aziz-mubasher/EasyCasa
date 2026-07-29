import { SetMetadata } from '@nestjs/common';

export const RELATIONSHIP_KEY = 'authority:relationship';

/**
 * Relationship gate metadata — connected to *this instance*?
 * Enforced by {@link RelationshipGuard} and/or domain services (deny by default).
 *
 * Known keys (EC-11):
 * - `viewing.conductor` — assigned conductor only
 * - `viewing.participant` — seeker or conductor
 * - `listing.owner` — owner_user_id / agency member
 * - `assignment.self` — assigned professional
 * - `self` — subject is the authenticated user
 */
export type RelationshipKey =
  | 'viewing.conductor'
  | 'viewing.participant'
  | 'listing.owner'
  | 'assignment.self'
  | 'self';

export const RequiresRelationship = (key: RelationshipKey) =>
  SetMetadata(RELATIONSHIP_KEY, key);
