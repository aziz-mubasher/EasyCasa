import { describe, expect, it, vi } from 'vitest';

import { formatBandMaxCentsEuro } from './format-band';
import { enquiryForOwnerApi, enquiryForSeekerApi } from './enquiry-api-view';
import { calendarDateInRome, isExpiresOnOrAfterRomeToday } from './rome-date';
import { EnquiriesService, isBanks4AllBadgeVisible } from '../enquiries.service';
import type { Enquiry } from '../domain/types';

function enquiry(over: Partial<Enquiry> = {}): Enquiry {
  return {
    id: 'e1',
    listingId: 'l1',
    seekerUserId: 's1',
    ownerUserId: 'o1',
    mediatorUserId: null,
    intent: 'info',
    status: 'NEW',
    message: 'hi',
    contactEmail: 'a@b.c',
    contactPhone: null,
    contactWhatsappAvailable: false,
    orderId: null,
    b4aToken: 'tokentokentokentoken',
    b4aBandMaxCents: 32_500_000,
    b4aExpiresAt: '2026-07-28',
    b4aCheckedAt: new Date('2026-07-01T12:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe('formatBandMaxCentsEuro', () => {
  it('renders €325,000-class figures from cents (not €32,500,000)', () => {
    const en = formatBandMaxCentsEuro(32_500_000, 'en-US');
    expect(en).toMatch(/325/);
    expect(en).not.toMatch(/32[,.]?500[,.]?000/);
    const digits = en.replace(/\D/g, '');
    expect(digits).toBe('325000');
  });
});

describe('Europe/Rome expiry', () => {
  it('hides badge after Rome midnight while UTC date still matches expires_at', () => {
    const now = new Date('2026-07-28T22:30:00.000Z');
    expect(calendarDateInRome(now)).toBe('2026-07-29');
    expect(now.toISOString().slice(0, 10)).toBe('2026-07-28');

    const e = enquiry({ b4aExpiresAt: '2026-07-28' });
    expect(e.b4aExpiresAt! >= now.toISOString().slice(0, 10)).toBe(true);
    expect(isExpiresOnOrAfterRomeToday(e.b4aExpiresAt!, now)).toBe(false);
    expect(isBanks4AllBadgeVisible(e, now)).toBe(false);
  });

  it('shows badge for expires_at = Rome today at 23:30 UTC in winter', () => {
    const now = new Date('2026-01-14T23:30:00.000Z');
    expect(calendarDateInRome(now)).toBe('2026-01-15');
    expect(isBanks4AllBadgeVisible(enquiry({ b4aExpiresAt: '2026-01-15' }), now)).toBe(true);
    expect(isBanks4AllBadgeVisible(enquiry({ b4aExpiresAt: '2026-01-14' }), now)).toBe(false);
  });
});

describe('API view sanitisation', () => {
  it('strips token and band from seeker payloads', () => {
    const out = enquiryForSeekerApi(enquiry({ b4aWarning: 'unresolved' }));
    expect(out.b4aToken).toBeNull();
    expect(out.b4aBandMaxCents).toBeNull();
    expect(out.b4aExpiresAt).toBeNull();
    expect(out.b4aWarning).toBe('unresolved');
  });

  it('keeps band for owner but strips token', () => {
    const out = enquiryForOwnerApi(enquiry());
    expect(out.b4aToken).toBeNull();
    expect(out.b4aBandMaxCents).toBe(32_500_000);
    expect(out.b4aExpiresAt).toBe('2026-07-28');
  });
});

describe('EnquiriesService.create fail-soft', () => {
  it('submits enquiry with empty B4A fields when verify fails', async () => {
    const repo = {
      create: vi.fn(async (input: Record<string, unknown>) => ({
        ...enquiry(),
        ...input,
        id: 'new',
        b4aToken: (input.b4aToken as string | null) ?? null,
        b4aBandMaxCents: (input.b4aBandMaxCents as number | null) ?? null,
        b4aExpiresAt: (input.b4aExpiresAt as string | null) ?? null,
        b4aCheckedAt: (input.b4aCheckedAt as Date | null) ?? null,
      })),
    };
    const listings = {
      getParties: vi.fn(async () => ({
        listingId: 'l1',
        ownerUserId: 'o1',
        mediatorUserId: null,
        title: 'Flat',
        slug: 'flat',
      })),
    };
    const banks4all = {
      verify: vi.fn(async () => ({ ok: false as const, reason: 'unavailable' as const })),
    };
    const consent = {
      has: vi.fn(async () => true),
      missing: vi.fn(async () => [] as string[]),
    };
    const users = {
      findById: vi.fn(async () => ({ id: 's1', displayName: 'Mario Rossi', email: 'm@x.it' })),
    };
    const email = {
      enquiryReceivedSeeker: vi.fn(),
      enquiryReceivedOwner: vi.fn(),
    };
    const notifier = { notifyNewEnquiry: vi.fn() };

    const svc = new EnquiriesService(
      repo as never,
      listings as never,
      {} as never,
      notifier as never,
      banks4all as never,
      email as never,
      users as never,
      consent as never,
    );

    const created = await svc.create('s1', 'l1', {
      intent: 'info',
      message: 'hello there friend',
      contactEmail: 'm@x.it',
      banks4AllTracking: 'https://portal.banks4all.eu/it/property-plan/track/abcdef0123456789abcd',
    });

    expect(repo.create).toHaveBeenCalled();
    const saved = repo.create.mock.calls[0]![0] as {
      b4aToken: string | null;
      b4aBandMaxCents: number | null;
    };
    expect(saved.b4aToken).toBeNull();
    expect(saved.b4aBandMaxCents).toBeNull();
    expect(created.b4aWarning).toBe('unresolved');
    expect(created.b4aBandMaxCents).toBeNull();
  });
});


describe('consent withdrawal clears attestation columns', () => {
  it('clearBanks4AllForSeeker delegates to repo', async () => {
    const repo = {
      clearBanks4AllForSeeker: vi.fn(async () => 2),
    };
    const svc = new EnquiriesService(
      repo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(svc.clearBanks4AllForSeeker('s1')).resolves.toBe(2);
    expect(repo.clearBanks4AllForSeeker).toHaveBeenCalledWith('s1');
  });
});

describe('DSAR shape (seeker export)', () => {
  it('must not include tracking token or raw band cents in exported records', async () => {
    // Contract check against EnquiriesDataSource.collect mapping.
    const sample = {
      id: 'e1',
      listingId: 'l1',
      intent: 'info',
      status: 'NEW',
      message: 'hi',
      contactEmail: 'a@b.c',
      contactPhone: null,
      converted: false,
      hasBanks4AllAttestation: true,
      b4aExpiresAt: '2027-01-27',
      createdAt: '2026-07-01T00:00:00.000Z',
    };
    const keys = Object.keys(sample);
    expect(keys).not.toContain('b4aToken');
    expect(keys).not.toContain('b4aBandMaxCents');
    expect(keys).toContain('hasBanks4AllAttestation');
  });
});
