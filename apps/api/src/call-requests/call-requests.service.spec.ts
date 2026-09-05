import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { buildCallBookingPath, parseCallBookingQuery } from '@easycasa/shared';

import { CallRequestsService } from './call-requests.service';

describe('call booking links', () => {
  it('builds a shareable path with province name and Italian motivo', () => {
    expect(buildCallBookingPath({ locale: 'it', province: 'BS', reason: 'sell' })).toBe(
      '/it/prenota-chiamata?provincia=Brescia&motivo=vendere',
    );
    expect(buildCallBookingPath({ locale: 'ur', province: 'BS', reason: 'sell' })).toBe(
      '/ur/prenota-chiamata?provincia=Brescia&motivo=vendere',
    );
    expect(buildCallBookingPath({ locale: 'hi', province: 'MI', reason: 'buy' })).toBe(
      '/hi/prenota-chiamata?provincia=Milano&motivo=comprare',
    );
  });

  it('parses name or sigla and motivo aliases', () => {
    expect(parseCallBookingQuery({ provincia: 'Brescia', motivo: 'vendere' })).toEqual({
      province: 'BS',
      reason: 'sell',
      provinceName: 'Brescia',
    });
    expect(parseCallBookingQuery({ province: 'bs', reason: 'sell_property' }).reason).toBe('sell');
  });
});

describe('CallRequestsService', () => {
  it('rejects unknown province and reason, then upserts a CRM call', async () => {
    const onCallRequestCreated = vi.fn().mockResolvedValue(undefined);
    const service = new CallRequestsService({ onCallRequestCreated } as never);

    await expect(
      service.create({
        fullName: 'Ada',
        email: 'ada@example.it',
        phone: '+39333111',
        province: 'Narnia',
        reason: 'sell',
        locale: 'it',
        consent: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create({
        fullName: 'Ada',
        email: 'ada@example.it',
        phone: '+39333111',
        province: 'BS',
        reason: 'offerta',
        locale: 'it',
        consent: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const preferred = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
    const out = await service.create({
      fullName: 'Ada',
      email: 'ada@example.it',
      phone: '+39 333 111 22 33',
      province: 'Brescia',
      reason: 'vendere',
      preferredAt: preferred,
      locale: 'it',
      consent: true,
    });
    expect(out.ok).toBe(true);
    expect(onCallRequestCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ada@example.it',
        phone: '+393331112233',
        province: 'BS',
        reason: 'sell',
      }),
    );
  });
});
