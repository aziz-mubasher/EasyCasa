import {
  SELLER_CHECKLIST_TYPE_CODES,
  badgeActive,
  uploadOpen,
  type SellerChecklistItem,
  type SellerChecklistTypeCode,
  type SellerDocScore,
  type VoState,
} from '@easycasa/shared';

import type { SellerListingItemWire } from '@/lib/seller-monetisation';

export type SellerTrustFlags = {
  verifiedOwnerEnabled: boolean;
  sellerChecklistEnabled: boolean;
};

export type SellerListingTrustWire = {
  verifiedOwner: boolean;
  voState: VoState | null;
  docScore: SellerDocScore | null;
};

export type SellerListingItemWithTrust = SellerListingItemWire & {
  trust?: SellerListingTrustWire | null;
};

export type SellerListingsWithTrustResponse = {
  flags: {
    listingBoostEnabled: boolean;
    sellerPremiumEnabled: boolean;
    verifiedOwnerEnabled: boolean;
    sellerChecklistEnabled: boolean;
  };
  items: SellerListingItemWithTrust[];
};

export type VoCaseWire = {
  id: string;
  listingId: string;
  state: VoState;
  docKeys: string[];
  nameMatchVerdict: string | null;
  nameMatchScore: number | null;
  decisionReason: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  updatedAt: string;
};

export type ChecklistWire = {
  listingId: string;
  items: SellerChecklistItem[];
  score: SellerDocScore;
  completeness: number;
};

/** UI phase labels — maps API `submitted` to brief's documents_submitted. */
export type VoUiPhase =
  | 'unverified'
  | 'documents_submitted'
  | 'in_review'
  | 'verified'
  | 'rejected'
  | 'revoked'
  | 'expired';

/** Moderator free-text reasons mapped to i18n template keys when matched exactly. */
export const VO_REJECTION_TEMPLATE_KEYS = [
  'illegible_document',
  'name_mismatch',
  'expired_document',
  'incomplete_submission',
  'wrong_listing',
] as const;

export type VoRejectionTemplateKey = (typeof VO_REJECTION_TEMPLATE_KEYS)[number];

const VO_REJECTION_ALIASES: Record<string, VoRejectionTemplateKey> = {
  'visura illeggibile': 'illegible_document',
  'documento illeggibile': 'illegible_document',
  'illegible document': 'illegible_document',
  'name mismatch': 'name_mismatch',
  'nome non corrisponde': 'name_mismatch',
  'document expired': 'expired_document',
  'documento scaduto': 'expired_document',
  'incomplete submission': 'incomplete_submission',
  'documenti incompleti': 'incomplete_submission',
  'wrong listing': 'wrong_listing',
  'annuncio errato': 'wrong_listing',
};

export function parseSellerListingsWithTrust(raw: unknown): SellerListingsWithTrustResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Partial<SellerListingsWithTrustResponse>;
  if (!body.flags || !Array.isArray(body.items)) return null;
  return {
    flags: {
      listingBoostEnabled: body.flags.listingBoostEnabled === true,
      sellerPremiumEnabled: body.flags.sellerPremiumEnabled === true,
      verifiedOwnerEnabled: body.flags.verifiedOwnerEnabled === true,
      sellerChecklistEnabled: body.flags.sellerChecklistEnabled === true,
    },
    items: body.items,
  };
}

export function parseVoCase(raw: unknown): VoCaseWire | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Partial<VoCaseWire>;
  if (typeof body.listingId !== 'string' || typeof body.state !== 'string') return null;
  return {
    id: typeof body.id === 'string' ? body.id : '',
    listingId: body.listingId,
    state: body.state as VoState,
    docKeys: Array.isArray(body.docKeys) ? body.docKeys.map(String) : [],
    nameMatchVerdict:
      typeof body.nameMatchVerdict === 'string' ? body.nameMatchVerdict : null,
    nameMatchScore:
      typeof body.nameMatchScore === 'number' && Number.isFinite(body.nameMatchScore)
        ? body.nameMatchScore
        : null,
    decisionReason:
      typeof body.decisionReason === 'string' ? body.decisionReason : null,
    verifiedAt: typeof body.verifiedAt === 'string' ? body.verifiedAt : null,
    expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : null,
    updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : new Date(0).toISOString(),
  };
}

export function parseChecklistResponse(raw: unknown): ChecklistWire | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Partial<ChecklistWire>;
  if (typeof body.listingId !== 'string' || !Array.isArray(body.items) || !body.score) {
    return null;
  }
  return body as ChecklistWire;
}

export function voStateToUiPhase(state: VoState): VoUiPhase {
  switch (state) {
    case 'none':
      return 'unverified';
    case 'submitted':
      return 'documents_submitted';
    case 'in_review':
      return 'in_review';
    case 'verified':
      return 'verified';
    case 'rejected':
      return 'rejected';
    case 'revoked':
      return 'revoked';
    case 'expired':
      return 'expired';
    default:
      return 'unverified';
  }
}

export function voCanSubmit(state: VoState): boolean {
  return uploadOpen(state);
}

export function voShowsRejectionReason(state: VoState): boolean {
  return state === 'rejected' || state === 'revoked';
}

export function resolveVoRejectionTemplateKey(
  reason: string | null | undefined,
): VoRejectionTemplateKey | null {
  if (!reason?.trim()) return null;
  const normalized = reason.trim().toLowerCase();
  return VO_REJECTION_ALIASES[normalized] ?? null;
}

export function parseIntestatariInput(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s).trim()).filter(Boolean);
    }
  } catch {
    // fall through — one name per line
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function shouldShowVoSurface(flags: SellerTrustFlags): boolean {
  return flags.verifiedOwnerEnabled;
}

export function shouldShowChecklistSurface(flags: SellerTrustFlags): boolean {
  return flags.sellerChecklistEnabled;
}

export function shouldShowTrustNav(flags: SellerTrustFlags): boolean {
  return flags.verifiedOwnerEnabled || flags.sellerChecklistEnabled;
}

export function listingShowsVerifiedBadge(trust: SellerListingTrustWire | null | undefined): boolean {
  if (!trust) return false;
  if (trust.verifiedOwner) return true;
  return trust.voState ? badgeActive(trust.voState) : false;
}

export function checklistTypeCodes(): readonly SellerChecklistTypeCode[] {
  return SELLER_CHECKLIST_TYPE_CODES;
}

export function slotHasDoc(item: SellerChecklistItem): boolean {
  return Boolean(item.docKey);
}
