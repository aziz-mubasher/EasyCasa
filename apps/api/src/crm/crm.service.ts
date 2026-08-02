import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canCrmExportOrErase,
  canCrmWrite,
  CRM_DORMANT_RETENTION_MONTHS_DEFAULT,
  CRM_OWNER_STAGES,
  CRM_PARTNER_STAGES,
  CRM_SEEKER_STAGES,
  type CrmOwnerStage,
  type CrmPartnerStage,
  type CrmPartnerType,
  type CrmRole,
  type CrmRoleKind,
  type CrmSeekerStage,
  type CrmTaskStatus,
} from '@easycasa/shared';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { CRM_REPOSITORY, type CrmRepository } from './domain/ports';
import { serializeContact, serializeContact360, serializeActivity, serializeTask } from './crm.serializer';

@Injectable()
export class CrmService {
  constructor(
    @Inject(CRM_REPOSITORY) private readonly repo: CrmRepository,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  retentionMonths(): number {
    return this.config.CRM_DORMANT_RETENTION_MONTHS ?? CRM_DORMANT_RETENTION_MONTHS_DEFAULT;
  }

  async listContacts(
    roles: readonly CrmRole[],
    actorUserId: string,
    filter: {
      query?: string;
      role?: string;
      stage?: string;
      owner?: string;
      page?: number;
    },
  ) {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    let seekerUserIds: string[] | undefined;
    if (roles.includes('crm-conductor') && !roles.some((r) => r === 'crm-admin' || r === 'crm-ops')) {
      seekerUserIds = await this.repo.listSeekerUserIdsForConductor(actorUserId);
    }
    const result = await this.repo.listContacts({
      query: filter.query,
      role: filter.role,
      stage: filter.stage,
      ownerAdminId: filter.owner,
      page,
      pageSize: 50,
      seekerUserIds,
    });
    await this.repo.audit({
      actorAdminId: actorUserId,
      action: 'list',
      entityType: 'crm_contact',
      entityId: '*',
      detail: { page, query: filter.query ?? null },
    });
    return {
      ...result,
      items: result.items.map((c) => serializeContact(c, roles)),
    };
  }

  async createContact(
    roles: readonly CrmRole[],
    actorUserId: string,
    body: {
      fullName: string;
      email?: string;
      phone?: string;
      locale?: string;
      tags?: string[];
      notesSummary?: string;
    },
  ) {
    this.assertWrite(roles);
    if (roles.includes('crm-marketing') && !canCrmWrite(roles)) {
      throw new ForbiddenException('crm-marketing cannot create contacts');
    }
    const contact = await this.repo.createContact({
      fullName: body.fullName,
      email: body.email ?? null,
      phone: body.phone ?? null,
      locale: body.locale ?? 'it',
      source: 'manual',
      tags: body.tags ?? [],
      notesSummary: body.notesSummary ?? null,
      ownerAdminId: actorUserId,
    });
    await this.repo.audit({
      actorAdminId: actorUserId,
      action: 'create',
      entityType: 'crm_contact',
      entityId: contact.id,
    });
    return serializeContact(contact, roles);
  }

  async getContact360(roles: readonly CrmRole[], actorUserId: string, id: string) {
    await this.assertConductorAccess(roles, actorUserId, id);
    const contact = await this.repo.findContactById(id);
    if (!contact) throw new NotFoundException('contact not found');
    const [seeker, owner, b4a, partner, activities, tasks] = await Promise.all([
      this.repo.getSeeker(id),
      this.repo.getOwner(id),
      this.repo.getB4a(id),
      this.repo.getPartner(id),
      this.repo.listActivities(id, 1, 40),
      this.repo.listTasks({ page: 1, pageSize: 50, status: 'open' }),
    ]);
    await this.repo.audit({
      actorAdminId: actorUserId,
      action: 'read_360',
      entityType: 'crm_contact',
      entityId: id,
    });
    return serializeContact360(
      {
        contact,
        seeker,
        owner,
        b4a,
        partner,
        recentActivities: activities.items,
        openTasks: tasks.items.filter((t) => t.contactId === id),
      },
      roles,
    );
  }

  async patchContact(
    roles: readonly CrmRole[],
    actorUserId: string,
    id: string,
    patch: Partial<{
      fullName: string;
      email: string | null;
      phone: string | null;
      locale: string;
      ownerAdminId: string | null;
      tags: string[];
      notesSummary: string | null;
    }>,
  ) {
    this.assertWrite(roles);
    await this.assertConductorAccess(roles, actorUserId, id);
    const existing = await this.repo.findContactById(id);
    if (!existing) throw new NotFoundException('contact not found');
    const updated = await this.repo.updateContact(id, patch);
    await this.repo.audit({
      actorAdminId: actorUserId,
      action: 'update',
      entityType: 'crm_contact',
      entityId: id,
      detail: { patch },
    });
    return serializeContact(updated, roles);
  }

  async attachRole(
    roles: readonly CrmRole[],
    actorUserId: string,
    id: string,
    role: CrmRoleKind,
    body: {
      stage?: string;
      searchIntent?: Record<string, unknown>;
      preferredChannel?: 'email' | 'phone' | 'whatsapp';
      listingIds?: string[];
      partnerType?: string;
      serviceZones?: string[];
      vatNumber?: string | null;
    },
  ) {
    this.assertWrite(roles);
    await this.assertConductorAccess(roles, actorUserId, id);
    const contact = await this.repo.findContactById(id);
    if (!contact) throw new NotFoundException('contact not found');
    if (role === 'seeker') {
      return this.repo.upsertSeeker(id, {
        stage: (body.stage as CrmSeekerStage | undefined) ?? 'new_enquiry',
        searchIntent: body.searchIntent ?? {},
      });
    }
    if (role === 'owner') {
      return this.repo.upsertOwner(id, {
        stage: (body.stage as CrmOwnerStage | undefined) ?? 'prospect',
        preferredChannel: body.preferredChannel ?? 'email',
        listingIds: body.listingIds ?? [],
      });
    }
    if (role === 'partner') {
      return this.repo.upsertPartner(id, {
        partnerType: (body.partnerType as CrmPartnerType | undefined) ?? 'other',
        stage: (body.stage as CrmPartnerStage | undefined) ?? 'prospect',
        serviceZones: body.serviceZones ?? [],
        vatNumber: body.vatNumber ?? null,
      });
    }
    if (role === 'b4a') {
      throw new BadRequestException('B4A role is attached via enquiry/sweep only');
    }
    throw new BadRequestException('unknown role');
  }

  async patchRole(
    roles: readonly CrmRole[],
    actorUserId: string,
    id: string,
    role: CrmRoleKind,
    body: { stage?: string; note?: string; preferredChannel?: string; listingIds?: string[] },
  ) {
    this.assertWrite(roles);
    await this.assertConductorAccess(roles, actorUserId, id);
    const contact = await this.repo.findContactById(id);
    if (!contact) throw new NotFoundException('contact not found');

    if (role === 'b4a') {
      throw new BadRequestException('B4A stages are derived from the nightly sweep; no manual edits');
    }

    if (role === 'seeker') {
      const stage = body.stage as CrmSeekerStage | undefined;
      if (!stage || !CRM_SEEKER_STAGES.includes(stage)) {
        throw new BadRequestException('invalid seeker stage');
      }
      const eventDriven: CrmSeekerStage[] = [
        'viewing_requested',
        'viewing_confirmed',
        'viewing_done',
      ];
      if (eventDriven.includes(stage) && !body.note?.trim()) {
        throw new BadRequestException('manual override of event-driven stage requires a note');
      }
      if (
        (stage === 'outcome_positive' || stage === 'outcome_negative' || stage === 'contacted' || stage === 'dormant') &&
        !body.note?.trim() &&
        eventDriven.includes(stage)
      ) {
        // already covered for event-driven; outcomes always want a note for discipline
      }
      if (
        (stage === 'outcome_positive' || stage === 'outcome_negative') &&
        !body.note?.trim()
      ) {
        throw new BadRequestException('outcome stage requires a note');
      }
      const prev = await this.repo.getSeeker(id);
      const updated = await this.repo.setSeekerStage(id, stage);
      if (body.note?.trim()) {
        await this.repo.addActivity({
          contactId: id,
          type: 'stage_change',
          body: `Manual stage ${prev?.stage ?? '?'} → ${stage}: ${body.note.trim()}`,
          actorAdminId: actorUserId,
        });
      } else {
        await this.repo.addActivity({
          contactId: id,
          type: 'stage_change',
          body: `Stage ${prev?.stage ?? '?'} → ${stage}`,
          actorAdminId: actorUserId,
        });
      }
      await this.repo.audit({
        actorAdminId: actorUserId,
        action: 'stage_change',
        entityType: 'crm_seeker',
        entityId: id,
        detail: { from: prev?.stage, to: stage, note: body.note ?? null },
      });
      return updated;
    }

    if (role === 'owner') {
      const stage = body.stage as CrmOwnerStage | undefined;
      if (stage && !CRM_OWNER_STAGES.includes(stage)) {
        throw new BadRequestException('invalid owner stage');
      }
      return this.repo.upsertOwner(id, {
        stage,
        preferredChannel: body.preferredChannel as 'email' | 'phone' | 'whatsapp' | undefined,
        listingIds: body.listingIds,
      });
    }

    if (role === 'partner') {
      const stage = body.stage as CrmPartnerStage | undefined;
      if (stage && !CRM_PARTNER_STAGES.includes(stage)) {
        throw new BadRequestException('invalid partner stage');
      }
      return this.repo.upsertPartner(id, { stage });
    }

    throw new BadRequestException('unknown role');
  }

  async listActivities(
    roles: readonly CrmRole[],
    actorUserId: string,
    id: string,
    page = 1,
  ) {
    await this.assertConductorAccess(roles, actorUserId, id);
    const result = await this.repo.listActivities(id, page, 40);
    return {
      ...result,
      items: result.items.map((a) => serializeActivity(a, roles)),
    };
  }

  async addActivity(
    roles: readonly CrmRole[],
    actorUserId: string,
    id: string,
    body: { type: 'note' | 'call' | 'email'; body: string },
  ) {
    this.assertWrite(roles);
    if (roles.includes('crm-marketing') && !canCrmWrite(roles)) {
      throw new ForbiddenException('crm-marketing cannot write free-text notes');
    }
    await this.assertConductorAccess(roles, actorUserId, id);
    const contact = await this.repo.findContactById(id);
    if (!contact) throw new NotFoundException('contact not found');
    const activity = await this.repo.addActivity({
      contactId: id,
      type: body.type,
      body: body.body,
      actorAdminId: actorUserId,
    });
    await this.repo.audit({
      actorAdminId: actorUserId,
      action: 'activity_create',
      entityType: 'crm_activity',
      entityId: activity.id,
      detail: { contactId: id, type: body.type },
    });
    return serializeActivity(activity, roles);
  }

  async listTasks(
    roles: readonly CrmRole[],
    actorUserId: string,
    filter: { assignee?: string; status?: CrmTaskStatus; due?: string; page?: number },
  ) {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    let dueBefore: Date | undefined;
    if (filter.due === 'today') {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      dueBefore = end;
    }
    const result = await this.repo.listTasks({
      assigneeAdminId: filter.assignee === 'me' ? actorUserId : filter.assignee,
      status: filter.status,
      dueBefore,
      page,
      pageSize: 50,
    });
    return {
      ...result,
      items: result.items.map((t) => serializeTask(t, roles)),
    };
  }

  async createTask(
    roles: readonly CrmRole[],
    actorUserId: string,
    body: { contactId: string; title: string; dueAt?: string; assigneeAdminId?: string },
  ) {
    this.assertWrite(roles);
    await this.assertConductorAccess(roles, actorUserId, body.contactId);
    const contact = await this.repo.findContactById(body.contactId);
    if (!contact) throw new NotFoundException('contact not found');
    const task = await this.repo.createTask({
      contactId: body.contactId,
      title: body.title,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      assigneeAdminId: body.assigneeAdminId ?? actorUserId,
    });
    return serializeTask(task, roles);
  }

  async patchTask(
    roles: readonly CrmRole[],
    actorUserId: string,
    id: string,
    body: { title?: string; dueAt?: string | null; status?: CrmTaskStatus; assigneeAdminId?: string },
  ) {
    this.assertWrite(roles);
    const existing = await this.repo.getTask(id);
    if (!existing) throw new NotFoundException('task not found');
    await this.assertConductorAccess(roles, actorUserId, existing.contactId);
    const updated = await this.repo.updateTask(id, {
      title: body.title,
      dueAt: body.dueAt === undefined ? undefined : body.dueAt ? new Date(body.dueAt) : null,
      status: body.status,
      assigneeAdminId: body.assigneeAdminId,
      completedAt: body.status === 'done' ? new Date() : body.status ? null : undefined,
    });
    if (body.status === 'done' && updated) {
      await this.repo.addActivity({
        contactId: existing.contactId,
        type: 'task_done',
        body: `Task completed: ${existing.title}`,
        actorAdminId: actorUserId,
      });
    }
    return updated ? serializeTask(updated, roles) : null;
  }

  async pipeline(roles: readonly CrmRole[], actorUserId: string, role: CrmRoleKind) {
    const cards = await this.repo.pipelineCards(role);
    let filtered = cards;
    if (roles.includes('crm-conductor') && !roles.some((r) => r === 'crm-admin' || r === 'crm-ops')) {
      const seekerIds = new Set(await this.repo.listSeekerUserIdsForConductor(actorUserId));
      const allowedContactIds = new Set<string>();
      for (const c of cards) {
        const contact = await this.repo.findContactById(c.contactId);
        if (contact?.userId && seekerIds.has(contact.userId)) allowedContactIds.add(c.contactId);
      }
      filtered = cards.filter((c) => allowedContactIds.has(c.contactId));
    }
    const byStage = new Map<string, typeof filtered>();
    for (const card of filtered) {
      const list = byStage.get(card.stage) ?? [];
      list.push(card);
      byStage.set(card.stage, list);
    }
    const stages =
      role === 'seeker'
        ? [...CRM_SEEKER_STAGES]
        : role === 'owner'
          ? [...CRM_OWNER_STAGES]
          : role === 'partner'
            ? [...CRM_PARTNER_STAGES]
            : (['referred', 'attestation_active', 'attestation_expired'] as const);
    return {
      role,
      readOnly: role === 'b4a',
      columns: stages.map((stage) => ({
        stage,
        count: (byStage.get(stage) ?? []).length,
        cards: (byStage.get(stage) ?? []).map((c) => ({
          contactId: c.contactId,
          fullName: c.fullName,
          email: isMarketingOnly(roles) ? null : c.email,
        })),
      })),
    };
  }

  async dashboard(roles: readonly CrmRole[], actorUserId: string) {
    const metrics = await this.repo.dashboardMetrics();
    const myTasks = await this.repo.listTasks({
      assigneeAdminId: actorUserId,
      status: 'open',
      dueBefore: endOfToday(),
      page: 1,
      pageSize: 20,
    });
    const seekerPipe = await this.pipeline(roles, actorUserId, 'seeker');
    await this.repo.audit({
      actorAdminId: actorUserId,
      action: 'read_dashboard',
      entityType: 'crm_dashboard',
      entityId: '*',
    });
    return {
      metrics,
      myTasksDueToday: myTasks.items.map((t) => serializeTask(t, roles)),
      seekerFunnel: seekerPipe.columns.map((c) => ({ stage: c.stage, count: c.count })),
      retentionMonths: this.retentionMonths(),
      crmEnabled: this.config.CRM_ENABLED,
    };
  }

  async exportContact(roles: readonly CrmRole[], actorUserId: string, id: string) {
    if (!canCrmExportOrErase(roles)) {
      throw new ForbiddenException('only crm-admin may export');
    }
    const bundle = await this.repo.exportBundle(id);
    if (!bundle.contact) throw new NotFoundException('contact not found');
    await this.repo.audit({
      actorAdminId: actorUserId,
      action: 'export',
      entityType: 'crm_contact',
      entityId: id,
    });
    return bundle;
  }

  async requestErasure(
    roles: readonly CrmRole[],
    actorUserId: string,
    id: string,
    confirm: boolean,
  ) {
    if (!canCrmExportOrErase(roles)) {
      throw new ForbiddenException('only crm-admin may request erasure');
    }
    if (!confirm) {
      throw new BadRequestException('dual-confirm required: confirm=true');
    }
    const contact = await this.repo.findContactById(id);
    if (!contact) throw new NotFoundException('contact not found');
    await this.repo.hardDeleteContact(id);
    await this.repo.audit({
      actorAdminId: actorUserId,
      action: 'erasure',
      entityType: 'crm_contact',
      entityId: id,
      detail: { email: contact.email, userId: contact.userId },
    });
    return { erased: true, contactId: id };
  }

  settings() {
    return {
      retentionMonths: this.retentionMonths(),
      crmEnabled: this.config.CRM_ENABLED,
      roleMatrix: [
        { role: 'crm-admin', access: 'Everything incl. erasure, exports, assignment' },
        { role: 'crm-ops', access: 'Full read/write except erasure & export' },
        { role: 'crm-conductor', access: 'Contacts linked to assigned viewings only' },
        { role: 'crm-marketing', access: 'Aggregates + lists; no phone / free-text notes' },
        { role: 'crm-readonly', access: 'Read-only, no exports' },
      ],
      pipelines: {
        seeker: [...CRM_SEEKER_STAGES],
        owner: [...CRM_OWNER_STAGES],
        b4a: ['referred', 'attestation_active', 'attestation_expired'],
        partner: [...CRM_PARTNER_STAGES],
      },
      gate: '§1.6 Q2a consent applied 2026-08-02 — set CRM_ENABLED=true in environment to process CRM personal data',
    };
  }

  private assertWrite(roles: readonly CrmRole[]) {
    if (!canCrmWrite(roles)) throw new ForbiddenException('insufficient crm write role');
  }

  private async assertConductorAccess(
    roles: readonly CrmRole[],
    actorUserId: string,
    contactId: string,
  ) {
    if (!roles.includes('crm-conductor')) return;
    if (roles.some((r) => r === 'crm-admin' || r === 'crm-ops')) return;
    const contact = await this.repo.findContactById(contactId);
    if (!contact?.userId) throw new ForbiddenException('conductor scope: contact not linked');
    const seekerIds = await this.repo.listSeekerUserIdsForConductor(actorUserId);
    if (!seekerIds.includes(contact.userId)) {
      throw new ForbiddenException('conductor scope: contact not on your viewings');
    }
  }
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function isMarketingOnly(roles: readonly CrmRole[]): boolean {
  return roles.includes('crm-marketing') && !roles.some((r) => r === 'crm-admin' || r === 'crm-ops');
}
