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

/** Side-effect port invoked from enquiry/viewing/B4A flows (no EventEmitter in repo). */
export interface CrmHooks {
  onEnquiryCreated(input: {
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
  }): Promise<void>;

  onViewingLifecycle(input: {
    viewingId: string;
    seekerUserId: string;
    enquiryId: string | null;
    kind: 'requested' | 'confirmed' | 'completed';
  }): Promise<void>;

  onB4aSweepRow(input: {
    seekerUserId: string;
    status: CrmB4aAttestationStatus;
    bandMaxCents: number | null;
    expiresAt: Date | null;
    holderInitials: string | null;
  }): Promise<void>;
}

export interface CrmRepository {
  findContactById(id: string): Promise<CrmContact | null>;
  findContactByEmail(email: string): Promise<CrmContact | null>;
  findContactByUserId(userId: string): Promise<CrmContact | null>;
  listContacts(filter: {
    query?: string;
    role?: string;
    stage?: string;
    ownerAdminId?: string;
    page: number;
    pageSize: number;
    /** When set, restrict to contacts linked to these viewing seeker user ids (conductor). */
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
  ): Promise<Array<{ stage: string; contactId: string; fullName: string; email: string | null }>>;
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
}
