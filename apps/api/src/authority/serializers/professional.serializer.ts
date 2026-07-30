/**
 * EC-14 — support projection for professionals (PII redacted by default).
 */

import type { Credential, Professional } from '../../professionals/domain/types';

export type ProfessionalProjection = Professional & {
  /** True when displayName / credential refs / document URLs are masked. */
  redacted: boolean;
};

function maskName(displayName: string, id: string): string {
  const tail = id.replace(/-/g, '').slice(-4);
  return `Professional ···${tail}`;
}

function redactCredential(c: Credential): Credential {
  return {
    type: c.type,
    status: c.status,
    expiresAt: c.expiresAt,
    // reference + documentUrl are PII / sensitive — omit when redacted
  };
}

/** Support list/detail — usable for status/coverage work without phone/email/name. */
export function professionalForSupport(raw: Professional): ProfessionalProjection {
  return {
    id: raw.id,
    displayName: maskName(raw.displayName, raw.id),
    coverageProvinces: raw.coverageProvinces,
    credentials: raw.credentials.map(redactCredential),
    activeAssignments: raw.activeAssignments,
    maxConcurrent: raw.maxConcurrent,
    redacted: true,
  };
}

export function professionalFull(raw: Professional): ProfessionalProjection {
  return { ...raw, redacted: false };
}
