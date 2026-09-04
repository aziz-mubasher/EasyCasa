import type {
  CrmActivityType,
  CrmB4aAttestationStatus,
  CrmContactSource,
  CrmOwnerStage,
  CrmPartnerStage,
  CrmPartnerType,
  CrmSeekerStage,
  CrmTaskStatus,
} from '@easycasa/shared';

export const CRM_REPOSITORY = Symbol('CRM_REPOSITORY');
export const CRM_HOOKS = Symbol('CRM_HOOKS');

/** §8 EnquiryRef — minimal host payload for CRM upsert. */
export interface CrmEnquiryRef {
  enquiryId: string;
  seekerUserId: string;
  contactEmail: string | null;
  contactPhone: string | null;
  fullNameHint: string | null;
  message: string | null;
  hasB4a: boolean;
  b4aBandMaxCents: number | null;
  b4aExpiresAt: Date | null;
  b4aHolderInitials: string | null;
}

/** §8 ViewingRef */
export interface CrmViewingRef {
  viewingId: string;
  seekerUserId: string;
  enquiryId: string | null;
}

/** Hook-driven seeker stages (viewing_*); not manually dragged without a note. */
export type CrmViewingHookStage =
  | 'viewing_requested'
  | 'viewing_confirmed'
  | 'viewing_done';

/** §8 B4aSweepRow — four attestation fields only. */
export interface CrmB4aSweepRow {
  seekerUserId: string;
  status: CrmB4aAttestationStatus;
  bandMaxCents: number | null;
  expiresAt: Date | null;
  holderInitials: string | null;
}

export interface CrmContact {
  id: string;
  userId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  locale: string;
  source: CrmContactSource;
  ownerAdminId: string | null;
  tags: string[];
  notesSummary: string | null;
  marketingConsentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmSeekerProfile {
  id: string;
  contactId: string;
  searchIntent: Record<string, unknown>;
  firstEnquiryId: string | null;
  stage: CrmSeekerStage;
  stageChangedAt: string;
}

export interface CrmOwnerProfile {
  id: string;
  contactId: string;
  stage: CrmOwnerStage;
  listingIds: string[];
  preferredChannel: 'email' | 'phone' | 'whatsapp';
}

export interface CrmB4aReferral {
  id: string;
  contactId: string;
  referredAt: string;
  attestationStatus: CrmB4aAttestationStatus;
  bandMaxCents: number | null;
  attestationExpiresAt: string | null;
  holderInitials: string | null;
  lastSweepAt: string | null;
}

export interface CrmPartnerProfile {
  id: string;
  contactId: string;
  partnerType: CrmPartnerType;
  stage: CrmPartnerStage;
  serviceZones: string[];
  vatNumber: string | null;
}

export interface CrmActivity {
  id: string;
  contactId: string;
  type: CrmActivityType;
  refTable: string | null;
  refId: string | null;
  body: string;
  actorAdminId: string | null;
  createdAt: string;
}

export interface CrmTask {
  id: string;
  contactId: string;
  title: string;
  dueAt: string | null;
  assigneeAdminId: string | null;
  status: CrmTaskStatus;
  completedAt: string | null;
  createdAt: string;
}

export interface CrmContact360 {
  contact: CrmContact;
  seeker: CrmSeekerProfile | null;
  owner: CrmOwnerProfile | null;
  b4a: CrmB4aReferral | null;
  partner: CrmPartnerProfile | null;
  openTasks: CrmTask[];
  recentActivities: CrmActivity[];
}

/**
 * §8 CRM_HOOKS — sanctioned integration (no domain EventEmitter).
 * Implementations must be fire-safe (catch internally); callers also use crmFireSafe.
 */
export interface CrmWhatsAppRef {
  waId: string;
  contactName: string | null;
  locale: string | null;
  bodyPreview: string | null;
  matchedUserId: string | null;
}

export interface CrmWhatsAppBriefRef {
  waId: string;
  locale: string;
  searchPreference: string;
}

/** Easy Legenda waitlist (`aste_leads`) — email only, no phone. */
export interface CrmAsteWaitlistRef {
  asteLeadId: string;
  email: string;
  locale: string | null;
  province: string | null;
  buyerType: string | null;
}

/**
 * Easy Legenda / Aste Analysis — authenticated user.
 * Do not pass CF, debtor names, or buyer_profile PII.
 */
export interface CrmAsteAnalysisRef {
  userId: string;
  analysisId: string;
  language: string | null;
  register: string | null;
  lottoLabel: string | null;
}

export interface CrmHooks {
  onEnquiryCreated(e: CrmEnquiryRef): Promise<void>;
  onViewingTransition(v: CrmViewingRef, to: CrmViewingHookStage): Promise<void>;
  onB4aSweepResult(r: CrmB4aSweepRow): Promise<void>;
  onWhatsAppInbound(e: CrmWhatsAppRef): Promise<void>;
  onWhatsAppSearchBrief(e: CrmWhatsAppBriefRef): Promise<void>;
  onAsteWaitlistLead(e: CrmAsteWaitlistRef): Promise<void>;
  onAsteAnalysisCreated(e: CrmAsteAnalysisRef): Promise<void>;
}

export interface CrmRepository {
  findContactById(id: string): Promise<CrmContact | null>;
  findContactByEmail(email: string): Promise<CrmContact | null>;
  findContactByPhone(phone: string): Promise<CrmContact | null>;
  findContactByUserId(userId: string): Promise<CrmContact | null>;
  listContacts(filter: {
    query?: string;
    role?: string;
    stage?: string;
    source?: string;
    ownerAdminId?: string;
    page: number;
    pageSize: number;
    seekerUserIds?: string[];
  }): Promise<{ items: CrmContact[]; total: number }>;
  createContact(input: {
    userId?: string | null;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    locale?: string;
    source: CrmContactSource;
    ownerAdminId?: string | null;
    tags?: string[];
    notesSummary?: string | null;
    marketingConsentId?: string | null;
  }): Promise<CrmContact>;
  updateContact(
    id: string,
    patch: Partial<{
      fullName: string;
      email: string | null;
      phone: string | null;
      locale: string;
      ownerAdminId: string | null;
      tags: string[];
      notesSummary: string | null;
      userId: string | null;
      marketingConsentId: string | null;
    }>,
  ): Promise<CrmContact>;
  getSeeker(contactId: string): Promise<CrmSeekerProfile | null>;
  getOwner(contactId: string): Promise<CrmOwnerProfile | null>;
  getB4a(contactId: string): Promise<CrmB4aReferral | null>;
  getPartner(contactId: string): Promise<CrmPartnerProfile | null>;
  upsertSeeker(
    contactId: string,
    input: {
      searchIntent?: Record<string, unknown>;
      firstEnquiryId?: string | null;
      stage?: CrmSeekerStage;
    },
  ): Promise<CrmSeekerProfile>;
  upsertOwner(
    contactId: string,
    input: {
      stage?: CrmOwnerStage;
      listingIds?: string[];
      preferredChannel?: 'email' | 'phone' | 'whatsapp';
    },
  ): Promise<CrmOwnerProfile>;
  upsertB4a(
    contactId: string,
    input: {
      attestationStatus: CrmB4aAttestationStatus;
      bandMaxCents?: number | null;
      attestationExpiresAt?: Date | null;
      holderInitials?: string | null;
      lastSweepAt?: Date | null;
    },
  ): Promise<CrmB4aReferral>;
  upsertPartner(
    contactId: string,
    input: {
      partnerType?: CrmPartnerType;
      stage?: CrmPartnerStage;
      serviceZones?: string[];
      vatNumber?: string | null;
    },
  ): Promise<CrmPartnerProfile>;
  setSeekerStage(contactId: string, stage: CrmSeekerStage): Promise<CrmSeekerProfile>;
  setOwnerStage(contactId: string, stage: CrmOwnerStage): Promise<CrmOwnerProfile>;
  setPartnerStage(contactId: string, stage: CrmPartnerStage): Promise<CrmPartnerProfile>;
  addActivity(input: {
    contactId: string;
    type: CrmActivityType;
    body: string;
    refTable?: string | null;
    refId?: string | null;
    actorAdminId?: string | null;
  }): Promise<CrmActivity>;
  listActivities(
    contactId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: CrmActivity[]; total: number }>;
  listTasks(filter: {
    assigneeAdminId?: string;
    status?: CrmTaskStatus;
    dueBefore?: Date;
    page: number;
    pageSize: number;
  }): Promise<{ items: CrmTask[]; total: number }>;
  createTask(input: {
    contactId: string;
    title: string;
    dueAt?: Date | null;
    assigneeAdminId?: string | null;
  }): Promise<CrmTask>;
  updateTask(
    id: string,
    patch: Partial<{
      title: string;
      dueAt: Date | null;
      assigneeAdminId: string | null;
      status: CrmTaskStatus;
      completedAt: Date | null;
    }>,
  ): Promise<CrmTask | null>;
  getTask(id: string): Promise<CrmTask | null>;
  pipelineCards(
    role: 'seeker' | 'owner' | 'b4a' | 'partner',
  ): Promise<
    Array<{
      stage: string;
      contactId: string;
      fullName: string;
      email: string | null;
      source: string;
    }>
  >;
  dashboardMetrics(): Promise<{
    enquiryToViewingRate: number | null;
    medianFirstResponseMinutes: number | null;
    viewingOutcomeRecordedRate: number | null;
    b4aReferralAttestationRate: number | null;
  }>;
  audit(input: {
    actorAdminId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    detail?: Record<string, unknown>;
  }): Promise<void>;
  exportBundle(contactId: string): Promise<Record<string, unknown>>;
  hardDeleteContact(contactId: string): Promise<void>;
  listDormantSeekersBefore(cutoff: Date): Promise<Array<{ contactId: string }>>;
  anonymizeContact(contactId: string): Promise<void>;
  listSeekerUserIdsForConductor(conductorUserId: string): Promise<string[]>;
  findLatestMarketingConsentId(subjectUserId: string): Promise<string | null>;
}
