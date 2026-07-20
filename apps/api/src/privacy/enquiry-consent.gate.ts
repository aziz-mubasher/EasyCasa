import { ForbiddenException } from '@nestjs/common';

import { ConsentService } from './consent.service';

/**
 * Gate the enquiry path on required consents (privacy policy + mediation
 * disclosure) — Phase 38. Call at the start of enquiry creation.
 */
export async function assertEnquiryConsents(
  consent: ConsentService,
  subjectId: string,
): Promise<void> {
  const missing = await consent.missing(subjectId);
  if (missing.length > 0) {
    throw new ForbiddenException(`missing required consent: ${missing.join(', ')}`);
  }
}
