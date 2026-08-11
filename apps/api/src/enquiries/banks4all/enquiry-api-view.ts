import type { Enquiry } from '../domain/types';

/**
 * Strip seeker-only attestation secrets from API payloads (EC-3).
 * Tracking token never leaves the API. Band/expiry are owner-inbox / email only.
 */
export function enquiryForSeekerApi(enquiry: Enquiry): Enquiry {
  const { b4aWarning, ...rest } = enquiry;
  return {
    ...rest,
    b4aToken: null,
    b4aBandMaxCents: null,
    b4aExpiresAt: null,
    b4aCheckedAt: null,
    b4aHolderInitials: null,
    b4aStatus: null,
    ...(b4aWarning ? { b4aWarning } : {}),
  };
}

/** Owner/mediator inbox — band for badge, never the tracking token. */
export function enquiryForOwnerApi(enquiry: Enquiry): Enquiry {
  return {
    ...enquiry,
    b4aToken: null,
  };
}
