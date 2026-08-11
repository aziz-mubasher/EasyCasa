import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ViewingsService } from './viewings.service';

function serviceWith(
  listings: { getConductor: ReturnType<typeof vi.fn> },
  viewings: { get: ReturnType<typeof vi.fn> },
) {
  return new ViewingsService(
    {} as never,
    viewings as never,
    listings as never,
    {} as never,
  );
}

describe('ViewingsService seller ownership (T21)', () => {
  it('assertSellerOwner allows listing owner only', async () => {
    const listings = {
      getConductor: vi.fn().mockResolvedValue({
        listingId: 'L1',
        conductorUserId: 'mediator',
        ownerUserId: 'owner',
      }),
    };
    const svc = serviceWith(listings, { get: vi.fn() });
    await expect(svc.assertSellerOwner('owner', 'L1')).resolves.toMatchObject({
      listingId: 'L1',
    });
    await expect(svc.assertSellerOwner('mediator', 'L1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('assertSellerOwnsViewing 404s missing viewing', async () => {
    const svc = serviceWith(
      { getConductor: vi.fn() },
      { get: vi.fn().mockResolvedValue(null) },
    );
    await expect(svc.assertSellerOwnsViewing('owner', 'V1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('assertSellerOwnsViewing checks listing ownership', async () => {
    const listings = {
      getConductor: vi.fn().mockResolvedValue({
        listingId: 'L1',
        conductorUserId: 'owner',
        ownerUserId: 'owner',
      }),
    };
    const viewings = {
      get: vi.fn().mockResolvedValue({
        id: 'V1',
        listingId: 'L1',
        seekerUserId: 's',
        conductorUserId: 'owner',
        enquiryId: null,
        startMs: 1,
        endMs: 2,
        status: 'REQUESTED',
        icsSequence: 0,
      }),
    };
    const svc = serviceWith(listings, viewings);
    await expect(svc.assertSellerOwnsViewing('owner', 'V1')).resolves.toMatchObject({
      id: 'V1',
    });
    await expect(svc.assertSellerOwnsViewing('other', 'V1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
