import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { AsteService } from './aste.service';
import type { CreateAsteLeadDto } from './dto/create-aste-lead.dto';

function dto(over: Partial<CreateAsteLeadDto> = {}): CreateAsteLeadDto {
  return {
    email: 'Buyer@Example.IT',
    language: 'it',
    locale: 'it',
    consent: true,
    province: 'MI',
    buyerType: 'prima_casa',
    ...over,
  };
}

describe('AsteService', () => {
  const insert = vi.fn();
  const update = vi.fn();
  const selectChain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  const db = {
    select: vi.fn(() => selectChain),
    insert: vi.fn(() => ({ values: insert })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: update })) })),
  };
  const email = { asteGuideDelivery: vi.fn(async () => ({ provider: 'noop', delivered: false })) };
  const analytics = { track: vi.fn() };

  let service: AsteService;

  beforeEach(() => {
    vi.clearAllMocks();
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);
    selectChain.limit.mockResolvedValue([]);
    insert.mockResolvedValue(undefined);
    update.mockResolvedValue(undefined);
    service = new AsteService(
      db as never,
      email as never,
      analytics as never,
    );
  });

  it('persists a new lead and returns a guide URL without logging email', async () => {
    const result = await service.createLead(dto());
    expect(result.ok).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.guideUrl).toMatch(/^https:\/\/easycasaita\.com\/it\/aste\/guida\?t=/);
    expect(insert).toHaveBeenCalled();
    expect(email.asteGuideDelivery).toHaveBeenCalledWith(
      'buyer@example.it',
      expect.objectContaining({ language: 'it' }),
    );
    expect(analytics.track).toHaveBeenCalledWith(
      'aste.signup_submitted',
      expect.objectContaining({ language: 'it', province: 'MI', duplicate: false }),
    );
    const trackProps = analytics.track.mock.calls[0]![1] as Record<string, unknown>;
    expect(trackProps).not.toHaveProperty('email');
  });

  it('rejects consent false', async () => {
    await expect(
      service.createLead({ ...dto(), consent: false as unknown as true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('handles duplicate email idempotently', async () => {
    selectChain.limit.mockResolvedValueOnce([
      { id: 'lead-1', guideToken: 'existing-token-abcdefghijklmnopqrst' },
    ]);
    const result = await service.createLead(dto({ language: 'en', locale: 'en' }));
    expect(result.duplicate).toBe(true);
    expect(result.guideUrl).toContain('existing-token-abcdefghijklmnopqrst');
    expect(insert).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
  });

  it('resolves a valid guide token', async () => {
    selectChain.limit.mockResolvedValueOnce([
      { language: 'en', locale: 'en', province: 'BS' },
    ]);
    const row = await service.resolveGuideToken('valid-token-abcdefghijklmnopqrst');
    expect(row.language).toBe('en');
    expect(analytics.track).toHaveBeenCalledWith(
      'aste.guide_opened',
      expect.objectContaining({ language: 'en', province: 'BS' }),
    );
  });

  it('404s unknown guide tokens', async () => {
    await expect(service.resolveGuideToken('missing-token-abcdefghijkl')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
