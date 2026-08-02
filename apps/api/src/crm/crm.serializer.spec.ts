import { describe, expect, it } from 'vitest';

import { serializeContact, serializeContact360, serializeActivity } from './crm.serializer';
import type { CrmActivity, CrmContact, CrmContact360 } from './domain/ports';

const contact: CrmContact = {
  id: 'c1',
  userId: 'u1',
  fullName: 'Mario Rossi',
  email: 'mario@example.it',
  phone: '+393331112233',
  locale: 'it',
  source: 'enquiry',
  ownerAdminId: null,
  tags: ['pilot'],
  notesSummary: 'Wants Brescia 3-bed',
  marketingConsentId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const note: CrmActivity = {
  id: 'a1',
  contactId: 'c1',
  type: 'note',
  refTable: null,
  refId: null,
  body: 'Called about viewing',
  actorAdminId: 'admin1',
  createdAt: new Date().toISOString(),
};

describe('CRM marketing redaction', () => {
  it('crm-marketing payload excludes phone and free-text notes', () => {
    const roles = ['crm-marketing'] as const;
    const out = serializeContact(contact, roles);
    expect(out.phone).toBeNull();
    expect(out.notesSummary).toBeNull();
    expect(out.email).toBe('mario@example.it');
    expect(out.fullName).toBe('Mario Rossi');

    const act = serializeActivity(note, roles);
    expect(act.body).toBe('[redacted]');
  });

  it('crm-ops keeps phone and notes', () => {
    const out = serializeContact(contact, ['crm-ops']);
    expect(out.phone).toBe('+393331112233');
    expect(out.notesSummary).toBe('Wants Brescia 3-bed');
    expect(serializeActivity(note, ['crm-ops']).body).toBe('Called about viewing');
  });

  it('crm-admin + crm-marketing does not redact (admin wins)', () => {
    const out = serializeContact(contact, ['crm-admin', 'crm-marketing']);
    expect(out.phone).toBe('+393331112233');
  });

  it('Contact-360 aggregate applies the same policy', () => {
    const bundle: CrmContact360 = {
      contact,
      seeker: null,
      owner: null,
      b4a: {
        id: 'b1',
        contactId: 'c1',
        referredAt: new Date().toISOString(),
        attestationStatus: 'none',
        bandMaxCents: null,
        attestationExpiresAt: null,
        holderInitials: null,
        lastSweepAt: null,
      },
      partner: null,
      openTasks: [],
      recentActivities: [note],
    };
    const out = serializeContact360(bundle, ['crm-marketing']);
    expect(out.contact.phone).toBeNull();
    expect(out.recentActivities[0]?.body).toBe('[redacted]');
    // B4A four fields only — no extra keys introduced by serializer
    expect(Object.keys(out.b4a!).sort()).toEqual(
      [
        'attestationExpiresAt',
        'attestationStatus',
        'bandMaxCents',
        'contactId',
        'holderInitials',
        'id',
        'lastSweepAt',
        'referredAt',
      ].sort(),
    );
  });
});
