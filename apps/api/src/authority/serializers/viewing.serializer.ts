/**
 * EC-11 viewing projections — distinct audiences, no optional PII on a shared DTO.
 */

import type { Viewing } from '../../viewings/domain/types';

export type ViewingForSeeker = {
  id: string;
  listingId: string;
  status: string;
  startMs: number;
  endMs: number;
  timezone?: string;
  areaLabel: string | null;
  listingTitle: string | null;
  /** Exact address only after CONFIRMED (mutual reveal). */
  address: string | null;
};

export type ViewingForConductor = {
  id: string;
  listingId: string;
  status: string;
  startMs: number;
  endMs: number;
  timezone?: string;
  areaLabel: string | null;
  listingTitle: string | null;
  address: string | null;
  /** Financing band — conductor of listing only; never seeker / second seeker. */
  b4aBandMaxCents: number | null;
  b4aExpiresAt: string | null;
};

export function viewingForSeeker(raw: Viewing): ViewingForSeeker {
  const confirmed = raw.status === 'CONFIRMED';
  return {
    id: raw.id,
    listingId: raw.listingId,
    status: raw.status,
    startMs: raw.startMs,
    endMs: raw.endMs,
    timezone: raw.timezone,
    areaLabel: raw.areaLabel ?? null,
    listingTitle: raw.listingTitle ?? null,
    address: confirmed ? (raw.address ?? null) : null,
  };
}

export function viewingForConductor(raw: Viewing): ViewingForConductor {
  return {
    id: raw.id,
    listingId: raw.listingId,
    status: raw.status,
    startMs: raw.startMs,
    endMs: raw.endMs,
    timezone: raw.timezone,
    areaLabel: raw.areaLabel ?? null,
    listingTitle: raw.listingTitle ?? null,
    address: raw.address ?? null,
    b4aBandMaxCents: raw.b4aBandMaxCents ?? null,
    b4aExpiresAt: raw.b4aExpiresAt ?? null,
  };
}
