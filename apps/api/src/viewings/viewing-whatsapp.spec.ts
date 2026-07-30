import { describe, expect, it } from 'vitest';

import {
  formatViewingWhenParts,
  verifiedPhoneE164,
  viewingAreaLabel,
  viewingUtilityBodyParams,
  viewingUtilityTemplateName,
} from './viewing-whatsapp';

const cfg = {
  WHATSAPP_VIEWING_REMINDER_24H_TEMPLATE: 'easycasa_viewing_reminder_24h',
  WHATSAPP_VIEWING_REMINDER_2H_TEMPLATE: 'easycasa_viewing_reminder_2h',
  WHATSAPP_VIEWING_REQUESTED_TEMPLATE: 'easycasa_viewing_requested',
  WHATSAPP_VIEWING_CONFIRMED_TEMPLATE: 'easycasa_viewing_confirmed',
  WHATSAPP_VIEWING_CANCELLED_TEMPLATE: 'easycasa_viewing_cancelled',
  WHATSAPP_OTP_TEMPLATE_LANG: 'it',
};

const listing = {
  title: 'Attico Navigli',
  address: 'Via Roma 1',
  city: 'Milano',
  province: 'MI',
};

describe('viewing-whatsapp (EC-16 pack)', () => {
  it('resolves template names per kind', () => {
    expect(viewingUtilityTemplateName('reminder24h', cfg)).toBe('easycasa_viewing_reminder_24h');
    expect(
      viewingUtilityTemplateName('confirmed', {
        ...cfg,
        WHATSAPP_VIEWING_CONFIRMED_TEMPLATE: '  ',
      }),
    ).toBe('');
  });

  it('matches EC-16 body variable order', () => {
    const base = {
      recipientName: 'Host',
      conductorName: 'Luca',
      otherPartyPhone: '+393331112233',
      listing,
      whenLocal: 'dom 3 ago 2026, 15:00',
      dateLocal: 'dom 3 ago 2026',
      timeLocal: '15:00',
    };
    expect(viewingUtilityBodyParams('requested', base)).toEqual([
      'Host',
      'Attico Navigli',
      'dom 3 ago 2026, 15:00',
    ]);
    expect(viewingUtilityBodyParams('confirmed', base)).toEqual([
      'Attico Navigli',
      'dom 3 ago 2026, 15:00',
      'Via Roma 1',
      'Luca',
    ]);
    expect(viewingUtilityBodyParams('reminder24h', base)).toEqual([
      'Attico Navigli',
      '15:00',
      'Via Roma 1',
    ]);
    expect(viewingUtilityBodyParams('reminder2h', base)).toEqual([
      'Attico Navigli',
      '15:00',
      'Via Roma 1',
      '+393331112233',
    ]);
    expect(viewingUtilityBodyParams('cancelled', base)).toEqual([
      'Attico Navigli',
      'dom 3 ago 2026',
      '15:00',
    ]);
  });

  it('verifiedPhoneE164 requires phone + phoneVerifiedAt', () => {
    expect(verifiedPhoneE164(null)).toBeNull();
    expect(
      verifiedPhoneE164({ phone: '+393331112233', phoneVerifiedAt: new Date('2026-01-01') }),
    ).toBe('+393331112233');
  });

  it('formatViewingWhenParts splits date and time', () => {
    const parts = formatViewingWhenParts(Date.UTC(2026, 7, 3, 13, 0), 'Europe/Rome');
    expect(parts.timeLocal).toMatch(/\d/);
    expect(parts.dateLocal.length).toBeGreaterThan(3);
    expect(viewingAreaLabel({ city: 'Milano', province: 'MI' })).toBe('Milano, MI');
  });
});
