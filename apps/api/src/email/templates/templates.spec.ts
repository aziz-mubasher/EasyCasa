import { describe, expect, it } from 'vitest';

import * as t from './templates';

describe('email templates', () => {
  it('enquiry->seeker renders it + en with listing + escaped input', () => {
    const it_ = t.enquiryReceivedSeeker(
      { seekerName: 'Anna', listingTitle: 'Bilocale <Navigli>', listingUrl: 'https://x/y' },
      'it',
    );
    expect(it_.subject).toContain('Bilocale <Navigli>');
    expect(it_.text).toContain('Ciao Anna');
    expect(it_.html).toContain('&lt;Navigli&gt;');
    const en = t.enquiryReceivedSeeker(
      { seekerName: 'Anna', listingTitle: 'Flat', listingUrl: 'https://x/y' },
      'en',
    );
    expect(en.subject.toLowerCase()).toContain('received');
  });

  it('enquiry->owner includes the seeker message + contact', () => {
    const r = t.enquiryReceivedOwner({
      ownerName: 'Luca',
      seekerName: 'Anna',
      seekerEmail: 'anna@e.it',
      listingTitle: 'Trilocale',
      message: 'E disponibile?',
    });
    expect(r.text).toContain('anna@e.it');
    expect(r.text).toContain('E disponibile?');
  });

  it('viewing confirmed shows address + local time', () => {
    const r = t.viewingConfirmed({
      seekerName: 'Anna',
      listingTitle: 'Attico',
      address: 'Via Roma 1, Milano',
      whenLocal: 'ven 25 lug 2026, 15:00',
    });
    expect(r.text).toContain('Via Roma 1, Milano');
    expect(r.text).toContain('15:00');
  });

  it('saved-search alert pluralizes and lists items', () => {
    const one = t.savedSearchAlert({
      seekerName: 'Anna',
      searchName: 'Navigli',
      listings: [{ title: 'A', priceLabel: '290.000', url: 'u1' }],
    });
    expect(one.subject).toContain('1 nuovo annuncio');
    const many = t.savedSearchAlert({
      seekerName: 'Anna',
      searchName: 'X',
      listings: [
        { title: 'A', priceLabel: '1', url: 'u1' },
        { title: 'B', priceLabel: '2', url: 'u2' },
      ],
    });
    expect(many.subject).toContain('2 nuovi annunci');
    expect(many.html).toContain('u1');
    expect(many.html).toContain('u2');
  });
});
