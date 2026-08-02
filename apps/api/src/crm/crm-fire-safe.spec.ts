import { describe, expect, it, vi } from 'vitest';

import { crmFireSafe } from './crm-fire-safe';
import { CrmHooksService } from './crm.hooks';
import type { CrmRepository } from './domain/ports';

describe('crmFireSafe / hook host isolation', () => {
  it('swallows thrown errors from the invoke fn', async () => {
    await expect(
      crmFireSafe('boom', async () => {
        throw new Error('crm down');
      }),
    ).resolves.toBeUndefined();
  });

  it('no-ops when invoke is undefined', async () => {
    await expect(crmFireSafe('noop', undefined)).resolves.toBeUndefined();
  });

  it('CrmHooksService onEnquiryCreated never rethrows repo failures', async () => {
    const repo = {
      findContactByUserId: vi.fn().mockRejectedValue(new Error('db down')),
      findContactByEmail: vi.fn(),
      findLatestMarketingConsentId: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      getSeeker: vi.fn(),
      upsertSeeker: vi.fn(),
      addActivity: vi.fn(),
      upsertB4a: vi.fn(),
      audit: vi.fn(),
    } as unknown as CrmRepository;

    const hooks = new CrmHooksService(repo, { CRM_ENABLED: true } as never);
    await expect(
      hooks.onEnquiryCreated({
        enquiryId: 'e1',
        seekerUserId: 'u1',
        contactEmail: 'a@b.it',
        contactPhone: null,
        fullNameHint: null,
        message: 'hi',
        hasB4a: false,
        b4aBandMaxCents: null,
        b4aExpiresAt: null,
        b4aHolderInitials: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('CrmHooksService onViewingTransition never rethrows', async () => {
    const repo = {
      findContactByUserId: vi.fn().mockRejectedValue(new Error('db down')),
    } as unknown as CrmRepository;
    const hooks = new CrmHooksService(repo, { CRM_ENABLED: true } as never);
    await expect(
      hooks.onViewingTransition(
        { viewingId: 'v1', seekerUserId: 'u1', enquiryId: null },
        'viewing_requested',
      ),
    ).resolves.toBeUndefined();
  });

  it('CrmHooksService onB4aSweepResult never rethrows', async () => {
    const repo = {
      findContactByUserId: vi.fn().mockRejectedValue(new Error('db down')),
    } as unknown as CrmRepository;
    const hooks = new CrmHooksService(repo, { CRM_ENABLED: true } as never);
    await expect(
      hooks.onB4aSweepResult({
        seekerUserId: 'u1',
        status: 'none',
        bandMaxCents: null,
        expiresAt: null,
        holderInitials: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('host-style double wrap still completes when hook throws before inner catch', async () => {
    const exploding: () => Promise<void> = async () => {
      throw new Error('uncaught path');
    };
    await expect(crmFireSafe('host', exploding)).resolves.toBeUndefined();
  });
});
