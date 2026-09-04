import { describe, expect, it, vi, beforeEach } from 'vitest';

import { crmSourceLabel } from '@easycasa/shared';

import { CrmHooksService } from './crm.hooks';

function contact(over: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    userId: null,
    fullName: 'Seeker',
    email: null,
    phone: null,
    locale: 'it',
    source: 'enquiry',
    ownerAdminId: null,
    tags: [],
    notesSummary: null,
    marketingConsentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

function mockRepo() {
  return {
    findContactByUserId: vi.fn().mockResolvedValue(null),
    findContactByEmail: vi.fn().mockResolvedValue(null),
    findContactByPhone: vi.fn().mockResolvedValue(null),
    createContact: vi.fn(async (input: { source: string; tags?: string[]; locale?: string }) =>
      contact({ id: 'new-1', source: input.source, tags: input.tags ?? [], locale: input.locale ?? 'it' }),
    ),
    updateContact: vi.fn(async (id: string, patch: Record<string, unknown>) =>
      contact({ id, ...patch }),
    ),
    getSeeker: vi.fn().mockResolvedValue(null),
    upsertSeeker: vi.fn().mockResolvedValue({ stage: 'new_enquiry' }),
    addActivity: vi.fn().mockResolvedValue({ id: 'act-1' }),
    createTask: vi.fn().mockResolvedValue({ id: 'task-1' }),
    audit: vi.fn().mockResolvedValue(undefined),
  };
}

describe('crmSourceLabel', () => {
  it('labels aste as Easy Legenda', () => {
    expect(crmSourceLabel('aste')).toBe('Easy Legenda');
    expect(crmSourceLabel('whatsapp')).toBe('WhatsApp');
  });
});

describe('CrmHooksService Easy Legenda + WhatsApp locale', () => {
  const repo = mockRepo();
  const users = { findById: vi.fn().mockResolvedValue(null) };
  let hooks: CrmHooksService;

  beforeEach(() => {
    vi.clearAllMocks();
    hooks = new CrmHooksService(
      repo as never,
      { CRM_ENABLED: true } as never,
      users as never,
    );
  });

  it('creates an Easy Legenda waitlist contact without debtor PII', async () => {
    await hooks.onAsteWaitlistLead({
      asteLeadId: '11111111-1111-1111-1111-111111111111',
      email: 'Buyer@Example.IT',
      locale: 'es',
      province: 'BS',
      buyerType: 'investor',
    });
    expect(repo.createContact).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'buyer@example.it',
        source: 'aste',
        locale: 'es',
        tags: ['easy-legenda', 'aste-waitlist'],
      }),
    );
    const created = repo.createContact.mock.calls[0]![0] as Record<string, unknown>;
    expect(JSON.stringify(created)).not.toMatch(/codice.?fiscale|debitore|buyer_profile/i);
    expect(repo.addActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'aste_ref', refTable: 'aste_leads' }),
    );
    expect(repo.upsertSeeker).toHaveBeenCalledWith(
      'new-1',
      expect.objectContaining({
        stage: 'new_enquiry',
        searchIntent: expect.objectContaining({
          channel: 'aste',
          brand: 'easy-legenda',
          kind: 'waitlist',
          province: 'BS',
        }),
      }),
    );
  });

  it('keeps an existing enquiry source and merges Easy Legenda tags on analysis', async () => {
    users.findById.mockResolvedValueOnce({
      id: 'u1',
      email: 'owner@example.it',
      displayName: 'Ada',
      phone: '+39333111',
    });
    repo.findContactByUserId.mockResolvedValueOnce(
      contact({ id: 'exist-1', source: 'enquiry', email: 'owner@example.it', tags: ['pilot'] }),
    );
    await hooks.onAsteAnalysisCreated({
      userId: 'u1',
      analysisId: '22222222-2222-2222-2222-222222222222',
      language: 'it',
      register: 'investor',
      lottoLabel: 'Lotto 3',
    });
    expect(repo.createContact).not.toHaveBeenCalled();
    expect(repo.updateContact).toHaveBeenCalledWith(
      'exist-1',
      expect.objectContaining({
        tags: ['pilot', 'easy-legenda', 'aste-analysis'],
      }),
    );
    const patch = repo.updateContact.mock.calls[0]![1] as Record<string, unknown>;
    expect(patch).not.toHaveProperty('source');
    expect(repo.addActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'aste_ref',
        refTable: 'aste_analyses',
        body: expect.stringContaining('Lotto 3'),
      }),
    );
  });

  it('maps Urdu WhatsApp ice-breaker onto CRM locale en and stores the WA code', async () => {
    await hooks.onWhatsAppInbound({
      waId: '393791112233',
      contactName: 'Ali',
      locale: 'ur',
      bodyPreview: 'السلام علیکم',
      matchedUserId: null,
    });
    expect(repo.createContact).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'whatsapp',
        locale: 'en',
        phone: '+393791112233',
      }),
    );
    expect(repo.upsertSeeker).toHaveBeenCalledWith(
      'new-1',
      expect.objectContaining({
        searchIntent: expect.objectContaining({
          channel: 'whatsapp',
          whatsappLanguage: 'ur',
        }),
      }),
    );
  });

  it('creates a scheduled Call task from a public booking request', async () => {
    const preferred = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await hooks.onCallRequestCreated({
      fullName: 'Ada Lovelace',
      email: 'Ada@Example.IT',
      phone: '+393331112233',
      locale: 'it',
      province: 'BS',
      reason: 'vendere',
      preferredAt: preferred,
    });
    expect(repo.createContact).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ada@example.it',
        source: 'call_request',
        tags: ['call-request'],
      }),
    );
    expect(repo.upsertSeeker).toHaveBeenCalledWith(
      'new-1',
      expect.objectContaining({
        stage: 'contacted',
        searchIntent: expect.objectContaining({
          channel: 'call_booking',
          province: 'BS',
          reason: 'sell',
        }),
      }),
    );
    expect(repo.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId: 'new-1',
        title: 'Call · Brescia · Vendita immobile',
        dueAt: preferred,
      }),
    );
  });

  it('labels call_request source', () => {
    expect(crmSourceLabel('call_request')).toBe('Call request');
  });

  it('is a no-op when CRM_ENABLED is false', async () => {
    const off = new CrmHooksService(repo as never, { CRM_ENABLED: false } as never);
    await off.onAsteWaitlistLead({
      asteLeadId: '11111111-1111-1111-1111-111111111111',
      email: 'x@y.it',
      locale: 'it',
      province: null,
      buyerType: null,
    });
    expect(repo.createContact).not.toHaveBeenCalled();
  });
});
