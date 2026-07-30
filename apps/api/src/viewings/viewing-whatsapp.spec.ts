import { describe, expect, it } from 'vitest';

import {
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

describe('viewing-whatsapp (Phase C)', () => {
  it('resolves template names per kind', () => {
    expect(viewingUtilityTemplateName('reminder24h', cfg)).toBe('easycasa_viewing_reminder_24h');
    expect(viewingUtilityTemplateName('reminder2h', cfg)).toBe('easycasa_viewing_reminder_2h');
    expect(
      viewingUtilityTemplateName('confirmed', {
        ...cfg,
        WHATSAPP_VIEWING_CONFIRMED_TEMPLATE: '  ',
      }),
    ).toBe('');
  });

  it('24h reminder omits street address; 2h/confirmed include it', () => {
    const base = {
      recipientName: 'Anna',
      listing,
      whenLocal: 'dom 3 ago, 15:00',
    };
    expect(viewingUtilityBodyParams('reminder24h', base)).toEqual([
      'Anna',
      'Attico Navigli',
      'Milano, MI',
      'dom 3 ago, 15:00',
    ]);
    expect(viewingUtilityBodyParams('reminder2h', base)).toEqual([
      'Anna',
      'Attico Navigli',
      'Via Roma 1',
      'dom 3 ago, 15:00',
    ]);
    expect(viewingUtilityBodyParams('confirmed', base)).toEqual([
      'Anna',
      'Attico Navigli',
      'Via Roma 1',
      'dom 3 ago, 15:00',
    ]);
  });

  it('requested uses area + seeker name', () => {
    expect(
      viewingUtilityBodyParams('requested', {
        recipientName: 'Host',
        seekerName: 'Anna',
        listing,
        whenLocal: 'lun 4 ago, 10:00',
      }),
    ).toEqual(['Host', 'Anna', 'Attico Navigli', 'Milano, MI', 'lun 4 ago, 10:00']);
  });

  it('verifiedPhoneE164 requires phone + phoneVerifiedAt', () => {
    expect(verifiedPhoneE164(null)).toBeNull();
    expect(verifiedPhoneE164({ phone: '+39333', phoneVerifiedAt: null })).toBeNull();
    expect(
      verifiedPhoneE164({ phone: '+393331112233', phoneVerifiedAt: new Date('2026-01-01') }),
    ).toBe('+393331112233');
  });

  it('viewingAreaLabel joins city/province', () => {
    expect(viewingAreaLabel({ city: 'Milano', province: 'MI' })).toBe('Milano, MI');
    expect(viewingAreaLabel({ city: null, province: null })).toBe('');
  });
});
