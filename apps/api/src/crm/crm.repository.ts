import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm';
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

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import {
  consentRecords,
  crmActivities,
  crmAuditLog,
  crmB4aReferrals,
  crmContacts,
  crmOwnerProfiles,
  crmPartnerProfiles,
  crmSeekerProfiles,
  crmTasks,
  enquiries,
  viewings,
} from '../db/schema';
import type {
  CrmActivity,
  CrmB4aReferral,
  CrmContact,
  CrmOwnerProfile,
  CrmPartnerProfile,
  CrmRepository,
  CrmSeekerProfile,
  CrmTask,
} from './domain/ports';

type ContactRow = typeof crmContacts.$inferSelect;
type SeekerRow = typeof crmSeekerProfiles.$inferSelect;
type OwnerRow = typeof crmOwnerProfiles.$inferSelect;
type B4aRow = typeof crmB4aReferrals.$inferSelect;
type PartnerRow = typeof crmPartnerProfiles.$inferSelect;
type ActivityRow = typeof crmActivities.$inferSelect;
type TaskRow = typeof crmTasks.$inferSelect;

function toContact(r: ContactRow): CrmContact {
  return {
    id: r.id,
    userId: r.userId,
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    locale: r.locale,
    source: r.source as CrmContactSource,
    ownerAdminId: r.ownerAdminId,
    tags: r.tags ?? [],
    notesSummary: r.notesSummary,
    marketingConsentId: r.marketingConsentId ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function toSeeker(r: SeekerRow): CrmSeekerProfile {
  return {
    id: r.id,
    contactId: r.contactId,
    searchIntent: (r.searchIntent ?? {}) as Record<string, unknown>,
    firstEnquiryId: r.firstEnquiryId,
    stage: r.stage as CrmSeekerStage,
    stageChangedAt: r.stageChangedAt.toISOString(),
  };
}

function toOwner(r: OwnerRow): CrmOwnerProfile {
  return {
    id: r.id,
    contactId: r.contactId,
    stage: r.stage as CrmOwnerStage,
    listingIds: r.listingIds ?? [],
    preferredChannel: r.preferredChannel as CrmOwnerProfile['preferredChannel'],
  };
}

function toB4a(r: B4aRow): CrmB4aReferral {
  return {
    id: r.id,
    contactId: r.contactId,
    referredAt: r.referredAt.toISOString(),
    attestationStatus: r.attestationStatus as CrmB4aAttestationStatus,
    bandMaxCents: r.bandMaxCents,
    attestationExpiresAt: r.attestationExpiresAt?.toISOString() ?? null,
    holderInitials: r.holderInitials,
    lastSweepAt: r.lastSweepAt?.toISOString() ?? null,
  };
}

function toPartner(r: PartnerRow): CrmPartnerProfile {
  return {
    id: r.id,
    contactId: r.contactId,
    partnerType: r.partnerType as CrmPartnerType,
    stage: r.stage as CrmPartnerStage,
    serviceZones: r.serviceZones ?? [],
    vatNumber: r.vatNumber,
  };
}

function toActivity(r: ActivityRow): CrmActivity {
  return {
    id: r.id,
    contactId: r.contactId,
    type: r.type as CrmActivityType,
    refTable: r.refTable,
    refId: r.refId,
    body: r.body,
    actorAdminId: r.actorAdminId,
    createdAt: r.createdAt.toISOString(),
  };
}

function toTask(r: TaskRow): CrmTask {
  return {
    id: r.id,
    contactId: r.contactId,
    title: r.title,
    dueAt: r.dueAt?.toISOString() ?? null,
    assigneeAdminId: r.assigneeAdminId,
    status: r.status as CrmTaskStatus,
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

@Injectable()
export class DrizzleCrmRepository implements CrmRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findContactById(id: string): Promise<CrmContact | null> {
    const [row] = await this.db
      .select()
      .from(crmContacts)
      .where(and(eq(crmContacts.id, id), isNull(crmContacts.deletedAt)))
      .limit(1);
    return row ? toContact(row) : null;
  }

  async findContactByEmail(email: string): Promise<CrmContact | null> {
    const [row] = await this.db
      .select()
      .from(crmContacts)
      .where(and(ilike(crmContacts.email, email), isNull(crmContacts.deletedAt)))
      .limit(1);
    return row ? toContact(row) : null;
  }

  async findContactByUserId(userId: string): Promise<CrmContact | null> {
    const [row] = await this.db
      .select()
      .from(crmContacts)
      .where(and(eq(crmContacts.userId, userId), isNull(crmContacts.deletedAt)))
      .limit(1);
    return row ? toContact(row) : null;
  }

  async listContacts(filter: {
    query?: string;
    role?: string;
    stage?: string;
    ownerAdminId?: string;
    page: number;
    pageSize: number;
    seekerUserIds?: string[];
  }): Promise<{ items: CrmContact[]; total: number }> {
    const offset = Math.max(0, (filter.page - 1) * filter.pageSize);
    const conds = [isNull(crmContacts.deletedAt)];
    if (filter.query?.trim()) {
      const q = `%${filter.query.trim()}%`;
      conds.push(
        or(ilike(crmContacts.fullName, q), ilike(crmContacts.email, q), ilike(crmContacts.phone, q))!,
      );
    }
    if (filter.ownerAdminId) {
      conds.push(eq(crmContacts.ownerAdminId, filter.ownerAdminId));
    }
    if (filter.seekerUserIds) {
      if (filter.seekerUserIds.length === 0) return { items: [], total: 0 };
      conds.push(inArray(crmContacts.userId, filter.seekerUserIds));
    }

    let roleContactIds: string[] | null = null;
    if (filter.role === 'seeker' || filter.role === 'owner' || filter.role === 'b4a' || filter.role === 'partner') {
      roleContactIds = await this.contactIdsForRole(filter.role, filter.stage);
      if (roleContactIds.length === 0) return { items: [], total: 0 };
      conds.push(inArray(crmContacts.id, roleContactIds));
    }

    const where = and(...conds);
    const [totalRow] = await this.db.select({ n: count() }).from(crmContacts).where(where);
    const rows = await this.db
      .select()
      .from(crmContacts)
      .where(where)
      .orderBy(desc(crmContacts.updatedAt))
      .limit(filter.pageSize)
      .offset(offset);
    return { items: rows.map(toContact), total: Number(totalRow?.n ?? 0) };
  }

  private async contactIdsForRole(role: string, stage?: string): Promise<string[]> {
    if (role === 'seeker') {
      const conds = [isNull(crmSeekerProfiles.deletedAt)];
      if (stage) conds.push(eq(crmSeekerProfiles.stage, stage));
      const rows = await this.db
        .select({ id: crmSeekerProfiles.contactId })
        .from(crmSeekerProfiles)
        .where(and(...conds));
      return rows.map((r) => r.id);
    }
    if (role === 'owner') {
      const conds = [isNull(crmOwnerProfiles.deletedAt)];
      if (stage) conds.push(eq(crmOwnerProfiles.stage, stage));
      const rows = await this.db
        .select({ id: crmOwnerProfiles.contactId })
        .from(crmOwnerProfiles)
        .where(and(...conds));
      return rows.map((r) => r.id);
    }
    if (role === 'b4a') {
      const conds = [isNull(crmB4aReferrals.deletedAt)];
      if (stage === 'attestation_active') conds.push(eq(crmB4aReferrals.attestationStatus, 'active'));
      else if (stage === 'attestation_expired') {
        conds.push(eq(crmB4aReferrals.attestationStatus, 'expired'));
      } else if (stage === 'referred') {
        conds.push(eq(crmB4aReferrals.attestationStatus, 'none'));
      }
      const rows = await this.db
        .select({ id: crmB4aReferrals.contactId })
        .from(crmB4aReferrals)
        .where(and(...conds));
      return rows.map((r) => r.id);
    }
    const conds = [isNull(crmPartnerProfiles.deletedAt)];
    if (stage) conds.push(eq(crmPartnerProfiles.stage, stage));
    const rows = await this.db
      .select({ id: crmPartnerProfiles.contactId })
      .from(crmPartnerProfiles)
      .where(and(...conds));
    return rows.map((r) => r.id);
  }

  async createContact(input: {
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
  }): Promise<CrmContact> {
    const [row] = await this.db
      .insert(crmContacts)
      .values({
        userId: input.userId ?? null,
        fullName: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        locale: input.locale ?? 'it',
        source: input.source,
        ownerAdminId: input.ownerAdminId ?? null,
        tags: input.tags ?? [],
        notesSummary: input.notesSummary ?? null,
        marketingConsentId: input.marketingConsentId ?? null,
      })
      .returning();
    return toContact(row);
  }

  async updateContact(
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
  ): Promise<CrmContact> {
    const [row] = await this.db
      .update(crmContacts)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(crmContacts.id, id), isNull(crmContacts.deletedAt)))
      .returning();
    return toContact(row);
  }

  async getSeeker(contactId: string): Promise<CrmSeekerProfile | null> {
    const [row] = await this.db
      .select()
      .from(crmSeekerProfiles)
      .where(and(eq(crmSeekerProfiles.contactId, contactId), isNull(crmSeekerProfiles.deletedAt)))
      .limit(1);
    return row ? toSeeker(row) : null;
  }

  async getOwner(contactId: string): Promise<CrmOwnerProfile | null> {
    const [row] = await this.db
      .select()
      .from(crmOwnerProfiles)
      .where(and(eq(crmOwnerProfiles.contactId, contactId), isNull(crmOwnerProfiles.deletedAt)))
      .limit(1);
    return row ? toOwner(row) : null;
  }

  async getB4a(contactId: string): Promise<CrmB4aReferral | null> {
    const [row] = await this.db
      .select()
      .from(crmB4aReferrals)
      .where(and(eq(crmB4aReferrals.contactId, contactId), isNull(crmB4aReferrals.deletedAt)))
      .limit(1);
    return row ? toB4a(row) : null;
  }

  async getPartner(contactId: string): Promise<CrmPartnerProfile | null> {
    const [row] = await this.db
      .select()
      .from(crmPartnerProfiles)
      .where(and(eq(crmPartnerProfiles.contactId, contactId), isNull(crmPartnerProfiles.deletedAt)))
      .limit(1);
    return row ? toPartner(row) : null;
  }

  async upsertSeeker(
    contactId: string,
    input: {
      searchIntent?: Record<string, unknown>;
      firstEnquiryId?: string | null;
      stage?: CrmSeekerStage;
    },
  ): Promise<CrmSeekerProfile> {
    const existing = await this.getSeeker(contactId);
    if (existing) {
      const [row] = await this.db
        .update(crmSeekerProfiles)
        .set({
          searchIntent: input.searchIntent ?? existing.searchIntent,
          firstEnquiryId:
            input.firstEnquiryId !== undefined ? input.firstEnquiryId : existing.firstEnquiryId,
          stage: input.stage ?? existing.stage,
          stageChangedAt: input.stage && input.stage !== existing.stage ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(crmSeekerProfiles.id, existing.id))
        .returning();
      return toSeeker(row);
    }
    const [row] = await this.db
      .insert(crmSeekerProfiles)
      .values({
        contactId,
        searchIntent: input.searchIntent ?? {},
        firstEnquiryId: input.firstEnquiryId ?? null,
        stage: input.stage ?? 'new_enquiry',
      })
      .returning();
    return toSeeker(row);
  }

  async upsertOwner(
    contactId: string,
    input: {
      stage?: CrmOwnerStage;
      listingIds?: string[];
      preferredChannel?: 'email' | 'phone' | 'whatsapp';
    },
  ): Promise<CrmOwnerProfile> {
    const existing = await this.getOwner(contactId);
    if (existing) {
      const [row] = await this.db
        .update(crmOwnerProfiles)
        .set({
          stage: input.stage ?? existing.stage,
          listingIds: input.listingIds ?? existing.listingIds,
          preferredChannel: input.preferredChannel ?? existing.preferredChannel,
          updatedAt: new Date(),
        })
        .where(eq(crmOwnerProfiles.id, existing.id))
        .returning();
      return toOwner(row);
    }
    const [row] = await this.db
      .insert(crmOwnerProfiles)
      .values({
        contactId,
        stage: input.stage ?? 'prospect',
        listingIds: input.listingIds ?? [],
        preferredChannel: input.preferredChannel ?? 'email',
      })
      .returning();
    return toOwner(row);
  }

  async upsertB4a(
    contactId: string,
    input: {
      attestationStatus: CrmB4aAttestationStatus;
      bandMaxCents?: number | null;
      attestationExpiresAt?: Date | null;
      holderInitials?: string | null;
      lastSweepAt?: Date | null;
    },
  ): Promise<CrmB4aReferral> {
    const existing = await this.getB4a(contactId);
    if (existing) {
      const [row] = await this.db
        .update(crmB4aReferrals)
        .set({
          attestationStatus: input.attestationStatus,
          bandMaxCents: input.bandMaxCents !== undefined ? input.bandMaxCents : existing.bandMaxCents,
          attestationExpiresAt:
            input.attestationExpiresAt !== undefined
              ? input.attestationExpiresAt
              : existing.attestationExpiresAt
                ? new Date(existing.attestationExpiresAt)
                : null,
          holderInitials:
            input.holderInitials !== undefined ? input.holderInitials : existing.holderInitials,
          lastSweepAt: input.lastSweepAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(crmB4aReferrals.id, existing.id))
        .returning();
      return toB4a(row);
    }
    const [row] = await this.db
      .insert(crmB4aReferrals)
      .values({
        contactId,
        attestationStatus: input.attestationStatus,
        bandMaxCents: input.bandMaxCents ?? null,
        attestationExpiresAt: input.attestationExpiresAt ?? null,
        holderInitials: input.holderInitials ?? null,
        lastSweepAt: input.lastSweepAt ?? new Date(),
      })
      .returning();
    return toB4a(row);
  }

  async upsertPartner(
    contactId: string,
    input: {
      partnerType?: CrmPartnerType;
      stage?: CrmPartnerStage;
      serviceZones?: string[];
      vatNumber?: string | null;
    },
  ): Promise<CrmPartnerProfile> {
    const existing = await this.getPartner(contactId);
    if (existing) {
      const [row] = await this.db
        .update(crmPartnerProfiles)
        .set({
          partnerType: input.partnerType ?? existing.partnerType,
          stage: input.stage ?? existing.stage,
          serviceZones: input.serviceZones ?? existing.serviceZones,
          vatNumber: input.vatNumber !== undefined ? input.vatNumber : existing.vatNumber,
          updatedAt: new Date(),
        })
        .where(eq(crmPartnerProfiles.id, existing.id))
        .returning();
      return toPartner(row);
    }
    const [row] = await this.db
      .insert(crmPartnerProfiles)
      .values({
        contactId,
        partnerType: input.partnerType ?? 'other',
        stage: input.stage ?? 'prospect',
        serviceZones: input.serviceZones ?? [],
        vatNumber: input.vatNumber ?? null,
      })
      .returning();
    return toPartner(row);
  }

  async setSeekerStage(contactId: string, stage: CrmSeekerStage): Promise<CrmSeekerProfile> {
    return this.upsertSeeker(contactId, { stage });
  }

  async setOwnerStage(contactId: string, stage: CrmOwnerStage): Promise<CrmOwnerProfile> {
    return this.upsertOwner(contactId, { stage });
  }

  async setPartnerStage(contactId: string, stage: CrmPartnerStage): Promise<CrmPartnerProfile> {
    return this.upsertPartner(contactId, { stage });
  }

  async addActivity(input: {
    contactId: string;
    type: CrmActivityType;
    body: string;
    refTable?: string | null;
    refId?: string | null;
    actorAdminId?: string | null;
  }): Promise<CrmActivity> {
    const [row] = await this.db
      .insert(crmActivities)
      .values({
        contactId: input.contactId,
        type: input.type,
        body: input.body,
        refTable: input.refTable ?? null,
        refId: input.refId ?? null,
        actorAdminId: input.actorAdminId ?? null,
      })
      .returning();
    return toActivity(row);
  }

  async listActivities(
    contactId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: CrmActivity[]; total: number }> {
    const where = and(eq(crmActivities.contactId, contactId), isNull(crmActivities.deletedAt));
    const [totalRow] = await this.db.select({ n: count() }).from(crmActivities).where(where);
    const rows = await this.db
      .select()
      .from(crmActivities)
      .where(where)
      .orderBy(desc(crmActivities.createdAt))
      .limit(pageSize)
      .offset(Math.max(0, (page - 1) * pageSize));
    return { items: rows.map(toActivity), total: Number(totalRow?.n ?? 0) };
  }

  async listTasks(filter: {
    assigneeAdminId?: string;
    status?: CrmTaskStatus;
    dueBefore?: Date;
    page: number;
    pageSize: number;
  }): Promise<{ items: CrmTask[]; total: number }> {
    const conds = [isNull(crmTasks.deletedAt)];
    if (filter.assigneeAdminId) conds.push(eq(crmTasks.assigneeAdminId, filter.assigneeAdminId));
    if (filter.status) conds.push(eq(crmTasks.status, filter.status));
    if (filter.dueBefore) conds.push(lte(crmTasks.dueAt, filter.dueBefore));
    const where = and(...conds);
    const [totalRow] = await this.db.select({ n: count() }).from(crmTasks).where(where);
    const rows = await this.db
      .select()
      .from(crmTasks)
      .where(where)
      .orderBy(asc(crmTasks.dueAt))
      .limit(filter.pageSize)
      .offset(Math.max(0, (filter.page - 1) * filter.pageSize));
    return { items: rows.map(toTask), total: Number(totalRow?.n ?? 0) };
  }

  async createTask(input: {
    contactId: string;
    title: string;
    dueAt?: Date | null;
    assigneeAdminId?: string | null;
  }): Promise<CrmTask> {
    const [row] = await this.db
      .insert(crmTasks)
      .values({
        contactId: input.contactId,
        title: input.title,
        dueAt: input.dueAt ?? null,
        assigneeAdminId: input.assigneeAdminId ?? null,
      })
      .returning();
    return toTask(row);
  }

  async updateTask(
    id: string,
    patch: Partial<{
      title: string;
      dueAt: Date | null;
      assigneeAdminId: string | null;
      status: CrmTaskStatus;
      completedAt: Date | null;
    }>,
  ): Promise<CrmTask | null> {
    const [row] = await this.db
      .update(crmTasks)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(crmTasks.id, id), isNull(crmTasks.deletedAt)))
      .returning();
    return row ? toTask(row) : null;
  }

  async getTask(id: string): Promise<CrmTask | null> {
    const [row] = await this.db
      .select()
      .from(crmTasks)
      .where(and(eq(crmTasks.id, id), isNull(crmTasks.deletedAt)))
      .limit(1);
    return row ? toTask(row) : null;
  }

  async pipelineCards(
    role: 'seeker' | 'owner' | 'b4a' | 'partner',
  ): Promise<Array<{ stage: string; contactId: string; fullName: string; email: string | null }>> {
    if (role === 'seeker') {
      const rows = await this.db
        .select({
          stage: crmSeekerProfiles.stage,
          contactId: crmContacts.id,
          fullName: crmContacts.fullName,
          email: crmContacts.email,
        })
        .from(crmSeekerProfiles)
        .innerJoin(crmContacts, eq(crmContacts.id, crmSeekerProfiles.contactId))
        .where(and(isNull(crmSeekerProfiles.deletedAt), isNull(crmContacts.deletedAt)));
      return rows;
    }
    if (role === 'owner') {
      const rows = await this.db
        .select({
          stage: crmOwnerProfiles.stage,
          contactId: crmContacts.id,
          fullName: crmContacts.fullName,
          email: crmContacts.email,
        })
        .from(crmOwnerProfiles)
        .innerJoin(crmContacts, eq(crmContacts.id, crmOwnerProfiles.contactId))
        .where(and(isNull(crmOwnerProfiles.deletedAt), isNull(crmContacts.deletedAt)));
      return rows;
    }
    if (role === 'partner') {
      const rows = await this.db
        .select({
          stage: crmPartnerProfiles.stage,
          contactId: crmContacts.id,
          fullName: crmContacts.fullName,
          email: crmContacts.email,
        })
        .from(crmPartnerProfiles)
        .innerJoin(crmContacts, eq(crmContacts.id, crmPartnerProfiles.contactId))
        .where(and(isNull(crmPartnerProfiles.deletedAt), isNull(crmContacts.deletedAt)));
      return rows;
    }
    const rows = await this.db
      .select({
        attestationStatus: crmB4aReferrals.attestationStatus,
        contactId: crmContacts.id,
        fullName: crmContacts.fullName,
        email: crmContacts.email,
      })
      .from(crmB4aReferrals)
      .innerJoin(crmContacts, eq(crmContacts.id, crmB4aReferrals.contactId))
      .where(and(isNull(crmB4aReferrals.deletedAt), isNull(crmContacts.deletedAt)));
    return rows.map((r) => ({
      stage:
        r.attestationStatus === 'active'
          ? 'attestation_active'
          : r.attestationStatus === 'expired'
            ? 'attestation_expired'
            : 'referred',
      contactId: r.contactId,
      fullName: r.fullName,
      email: r.email,
    }));
  }

  async dashboardMetrics(): Promise<{
    enquiryToViewingRate: number | null;
    medianFirstResponseMinutes: number | null;
    viewingOutcomeRecordedRate: number | null;
    b4aReferralAttestationRate: number | null;
  }> {
    const [enq] = await this.db.select({ n: count() }).from(enquiries);
    const [viewReq] = await this.db.select({ n: count() }).from(viewings);
    const enquiryCount = Number(enq?.n ?? 0);
    const viewingCount = Number(viewReq?.n ?? 0);
    const enquiryToViewingRate =
      enquiryCount === 0 ? null : Math.min(1, viewingCount / enquiryCount);

    const firstResponse = await this.db.execute<{ mins: number }>(sql`
      SELECT EXTRACT(EPOCH FROM (a.created_at - c.created_at)) / 60.0 AS mins
      FROM crm.contacts c
      INNER JOIN LATERAL (
        SELECT created_at FROM crm.activities
        WHERE contact_id = c.id AND type IN ('call', 'email', 'note') AND deleted_at IS NULL
        ORDER BY created_at ASC LIMIT 1
      ) a ON true
      WHERE c.deleted_at IS NULL AND c.source = 'enquiry'
      ORDER BY mins
    `);
    const mins = (firstResponse.rows ?? []).map((r) => Number(r.mins)).filter((n) => !Number.isNaN(n));
    const medianFirstResponseMinutes =
      mins.length === 0
        ? null
        : mins.length % 2 === 1
          ? mins[(mins.length - 1) / 2]!
          : (mins[mins.length / 2 - 1]! + mins[mins.length / 2]!) / 2;

    const doneSeekers = await this.db
      .select({ n: count() })
      .from(crmSeekerProfiles)
      .where(
        and(
          isNull(crmSeekerProfiles.deletedAt),
          inArray(crmSeekerProfiles.stage, [
            'viewing_done',
            'outcome_positive',
            'outcome_negative',
          ]),
        ),
      );
    const outcomeSeekers = await this.db
      .select({ n: count() })
      .from(crmSeekerProfiles)
      .where(
        and(
          isNull(crmSeekerProfiles.deletedAt),
          inArray(crmSeekerProfiles.stage, ['outcome_positive', 'outcome_negative']),
        ),
      );
    const doneN = Number(doneSeekers[0]?.n ?? 0);
    const outcomeN = Number(outcomeSeekers[0]?.n ?? 0);
    const viewingOutcomeRecordedRate = doneN === 0 ? null : outcomeN / doneN;

    const [b4aTotal] = await this.db
      .select({ n: count() })
      .from(crmB4aReferrals)
      .where(isNull(crmB4aReferrals.deletedAt));
    const [b4aActive] = await this.db
      .select({ n: count() })
      .from(crmB4aReferrals)
      .where(
        and(
          isNull(crmB4aReferrals.deletedAt),
          eq(crmB4aReferrals.attestationStatus, 'active'),
        ),
      );
    const b4aN = Number(b4aTotal?.n ?? 0);
    const b4aReferralAttestationRate =
      b4aN === 0 ? null : Number(b4aActive?.n ?? 0) / b4aN;

    return {
      enquiryToViewingRate,
      medianFirstResponseMinutes,
      viewingOutcomeRecordedRate,
      b4aReferralAttestationRate,
    };
  }

  async audit(input: {
    actorAdminId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    detail?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.insert(crmAuditLog).values({
      actorAdminId: input.actorAdminId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      detail: input.detail ?? {},
    });
  }

  async exportBundle(contactId: string): Promise<Record<string, unknown>> {
    const contact = await this.findContactById(contactId);
    if (!contact) return {};
    const [seeker, owner, b4a, partner, activities, tasks] = await Promise.all([
      this.getSeeker(contactId),
      this.getOwner(contactId),
      this.getB4a(contactId),
      this.getPartner(contactId),
      this.listActivities(contactId, 1, 500),
      this.listTasks({ page: 1, pageSize: 200 }),
    ]);
    const contactTasks = tasks.items.filter((t) => t.contactId === contactId);
    let enquiryRefs: unknown[] = [];
    let viewingRefs: unknown[] = [];
    if (contact.userId) {
      enquiryRefs = await this.db
        .select({
          id: enquiries.id,
          listingId: enquiries.listingId,
          status: enquiries.status,
          intent: enquiries.intent,
          createdAt: enquiries.createdAt,
        })
        .from(enquiries)
        .where(eq(enquiries.seekerUserId, contact.userId));
      viewingRefs = await this.db
        .select({
          id: viewings.id,
          listingId: viewings.listingId,
          status: viewings.status,
          startAt: viewings.startAt,
        })
        .from(viewings)
        .where(eq(viewings.seekerUserId, contact.userId));
    }
    return {
      exportedAt: new Date().toISOString(),
      contact,
      profiles: { seeker, owner, b4a, partner },
      activities: activities.items,
      tasks: contactTasks,
      referenced: { enquiries: enquiryRefs, viewings: viewingRefs },
    };
  }

  async hardDeleteContact(contactId: string): Promise<void> {
    await this.db.delete(crmContacts).where(eq(crmContacts.id, contactId));
  }

  async listDormantSeekersBefore(cutoff: Date): Promise<Array<{ contactId: string }>> {
    const rows = await this.db
      .select({ contactId: crmSeekerProfiles.contactId })
      .from(crmSeekerProfiles)
      .where(
        and(
          isNull(crmSeekerProfiles.deletedAt),
          eq(crmSeekerProfiles.stage, 'dormant'),
          lt(crmSeekerProfiles.stageChangedAt, cutoff),
        ),
      );
    return rows;
  }

  async anonymizeContact(contactId: string): Promise<void> {
    await this.db
      .update(crmContacts)
      .set({
        fullName: '[anonymized]',
        email: null,
        phone: null,
        notesSummary: null,
        tags: [],
        userId: null,
        marketingConsentId: null,
        updatedAt: new Date(),
        deletedAt: new Date(),
      })
      .where(eq(crmContacts.id, contactId));
    await this.db
      .update(crmActivities)
      .set({ body: '[anonymized]', deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(crmActivities.contactId, contactId));
  }

  async listSeekerUserIdsForConductor(conductorUserId: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ seekerUserId: viewings.seekerUserId })
      .from(viewings)
      .where(eq(viewings.conductorUserId, conductorUserId));
    return rows.map((r) => r.seekerUserId);
  }

  async findLatestMarketingConsentId(subjectUserId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ id: consentRecords.id })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.subjectUserId, subjectUserId),
          eq(consentRecords.purpose, 'marketing'),
          eq(consentRecords.granted, true),
        ),
      )
      .orderBy(desc(consentRecords.createdAt))
      .limit(1);
    return row?.id ?? null;
  }
}
