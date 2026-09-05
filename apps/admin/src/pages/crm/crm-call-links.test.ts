import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  CALL_BOOKING_LOCALES,
  buildCallBookingInvite,
  buildCallBookingPath,
  parseCallBookingLocale,
} from '@easycasa/shared';

const PAGE = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'CrmCallLinks.tsx'),
  'utf8',
);

describe('CRM shareable call links — desk languages', () => {
  it('exposes IT EN ES UR HI on the Call links page', () => {
    expect([...CALL_BOOKING_LOCALES]).toEqual(['it', 'en', 'es', 'ur', 'hi']);
    expect(parseCallBookingLocale('ur')).toBe('ur');
    expect(parseCallBookingLocale('hi')).toBe('hi');
    expect(PAGE).toContain('CALL_BOOKING_LOCALES');
    expect(PAGE).toContain('buildCallBookingInvite');
    expect(PAGE).toContain('Copy invitation');
  });

  it('builds the EC Consult invitation in the Urdu pattern', () => {
    const url = `https://easycasaita.com${buildCallBookingPath({
      locale: 'ur',
      province: 'BS',
      reason: 'sell',
    })}`;
    const text = buildCallBookingInvite({ locale: 'ur', name: 'Ahmed', url });
    expect(text).toBe(
      [
        'Salam o alaikum, Ahmed',
        'اپنی زبان میں ہمارے ساتھ 15 منٹ کی دریافت کال بک کریں۔ اپنا پسندیدہ دن اور وقت منتخب کرنے کے لیے نیچے کلک کریں۔ تصدیق واٹس ایپ اور ای میل کے ذریعے بھیجی جائے گی۔',
        'https://easycasaita.com/ur/prenota-chiamata?provincia=Brescia&motivo=vendere',
      ].join('\n'),
    );
  });

  it('uses the same greeting + 15-minute + WhatsApp/email pattern in every language', () => {
    const url = 'https://easycasaita.com/en/prenota-chiamata?provincia=Brescia&motivo=vendere';
    for (const locale of CALL_BOOKING_LOCALES) {
      const text = buildCallBookingInvite({ locale, name: 'Ada', url });
      expect(text).toContain(', Ada');
      expect(text).toContain(url);
    }
    expect(buildCallBookingInvite({ locale: 'en', url })).toBe(
      ['Hello,', 'Book a 15-minute discovery call with us in your language. Click below to choose your preferred day and time. Confirmation will be sent on WhatsApp and by email.', url].join('\n'),
    );
    expect(buildCallBookingInvite({ locale: 'ur', whatsappName: 'Ali', url })).toContain(
      'Salam o alaikum, Ali',
    );
    expect(buildCallBookingInvite({ locale: 'ur', name: 'Ahmed', whatsappName: 'Ali', url })).toContain(
      'Salam o alaikum, Ahmed',
    );
    expect(buildCallBookingInvite({ locale: 'hi', name: 'Priya', url })).toContain('Namaste, Priya');
    expect(buildCallBookingInvite({ locale: 'hi', name: 'Priya', url })).toContain(
      '15 मिनट की डिस्कवरी कॉल',
    );
  });
});
