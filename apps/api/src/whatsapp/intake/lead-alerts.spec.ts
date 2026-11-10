import { describe, expect, it } from 'vitest';

import {
  alertSubject,
  atRome,
  auctionDateSet,
  detailAlertActive,
  leadDetailMessage,
  planLeadAlerts,
  romeParts,
  type AlertLead,
  type DutyWindow,
} from './lead-alerts';

const linkFor = (id: string) => `https://admin.easycasaita.com/#whatsapp/leads/${id}`;

function person(userId: string, role: DutyWindow['role'], days: number[], start = 9 * 60, end = 18 * 60): DutyWindow {
  return { userId, role, days, startMin: start, endMin: end, active: true };
}

function lead(over: Partial<AlertLead> = {}): AlertLead {
  return {
    id: 'lead-1',
    status: 'new',
    product: 'easy_legenda',
    route: 'route_auction',
    locale: 'ur',
    createdAt: atRome(2026, 11, 10, 10, 0),
    assignedAt: null,
    ownerUserId: null,
    openedAt: null,
    contactedAt: null,
    windowRemainingMs: 23 * 60 * 60 * 1000,
    auctionDateSet: false,
    ...over,
  };
}

const weekday = [person('primary-1', 'primary', [1, 2, 3, 4, 5]), person('backup-1', 'backup', [1, 2, 3, 4, 5]), person('owner-1', 'owner', [1, 2, 3, 4, 5])];

describe('lead alert ladder', () => {
  it('reads 10:00 Europe/Rome on Tuesday 10 Nov 2026', () => {
    const at = atRome(2026, 11, 10, 10, 0);
    expect(romeParts(at)).toMatchObject({ weekday: 2, minutes: 10 * 60 });
  });

  it('sends only an in-admin alert at T+0 when someone is online', () => {
    const now = atRome(2026, 11, 10, 10, 0);
    const actions = planLeadAlerts({
      now,
      roster: weekday,
      onlineUserIds: ['consultant-1'],
      leads: [lead({ createdAt: now })],
      sent: new Set(),
      linkFor,
    });
    expect(actions.map((action) => action.channel)).toEqual(['in_app']);
    expect(actions[0]).toMatchObject({ step: 'online_t0', userIds: ['consultant-1'] });
  });

  it('emails the on-duty primary at T+0 when nobody is online', () => {
    const now = atRome(2026, 11, 10, 10, 0);
    const actions = planLeadAlerts({
      now,
      roster: weekday,
      onlineUserIds: [],
      leads: [lead({ createdAt: now })],
      sent: new Set(),
      linkFor,
    });
    expect(actions.map((action) => action.channel)).toEqual(['email']);
    expect(actions[0]).toMatchObject({ step: 'offline_t0', userIds: ['primary-1'] });
  });

  it('does not send the 15-minute email after the lead is assigned', () => {
    const createdAt = atRome(2026, 11, 10, 10, 0);
    const now = atRome(2026, 11, 10, 10, 20);
    const open = planLeadAlerts({
      now,
      roster: weekday,
      onlineUserIds: ['consultant-1'],
      leads: [lead({ createdAt })],
      sent: new Set(['lead-1:online_t0']),
      linkFor,
    });
    expect(open.some((action) => action.step === 'primary_15')).toBe(true);
    const assigned = planLeadAlerts({
      now,
      roster: weekday,
      onlineUserIds: ['consultant-1'],
      leads: [lead({ createdAt, status: 'assigned', assignedAt: atRome(2026, 11, 10, 10, 5), ownerUserId: 'primary-1' })],
      sent: new Set(['lead-1:online_t0']),
      linkFor,
    });
    expect(assigned.some((action) => action.step === 'primary_15' || action.step === 'offline_t0')).toBe(false);
  });

  it('sends nothing from 22:00 to 06:00', () => {
    const roster = [person('primary-1', 'primary', [1, 2, 3, 4, 5, 6, 7], 0, 24 * 60)];
    for (const now of [atRome(2026, 11, 10, 22, 0), atRome(2026, 11, 10, 23, 30), atRome(2026, 11, 11, 5, 59)]) {
      const actions = planLeadAlerts({
        now,
        roster,
        onlineUserIds: ['consultant-1'],
        leads: [lead({ createdAt: now, auctionDateSet: true })],
        sent: new Set(),
        linkFor,
      });
      expect(actions).toEqual([]);
    }
    const open = planLeadAlerts({
      now: atRome(2026, 11, 10, 6, 0),
      roster,
      onlineUserIds: [],
      leads: [lead({ createdAt: atRome(2026, 11, 10, 6, 0) })],
      sent: new Set(),
      linkFor,
    });
    expect(open.some((action) => action.channel === 'email')).toBe(true);
  });

  it('puts every overnight lead in one digest email', () => {
    const roster = [person('monday-1', 'primary', [1], 9 * 60, 18 * 60), person('saturday-1', 'primary', [6], 9 * 60, 13 * 60)];
    const overnight = [1, 2, 3].map((n) =>
      lead({
        id: `night-${n}`,
        createdAt: atRome(2026, 11, 15, 20, 0),
        product: n === 2 ? 'easy_casa' : 'easy_legenda',
        route: n === 2 ? 'route_buy' : 'route_auction',
      }),
    );
    const monday = atRome(2026, 11, 16, 8, 30);
    const first = planLeadAlerts({ now: monday, roster, onlineUserIds: [], leads: overnight, sent: new Set(), linkFor });
    const digest = first.find((action) => action.step === 'digest');
    expect(digest?.channel).toBe('digest');
    expect(digest?.leadIds).toEqual(['night-1', 'night-2', 'night-3']);
    expect(digest?.userIds).toEqual(['monday-1']);
    expect(digest?.body.match(/#whatsapp\/leads\//g)).toHaveLength(3);
    expect(first.filter((action) => action.channel === 'email' || action.channel === 'digest')).toHaveLength(1);

    const sent = new Set(overnight.map((item) => `${item.id}:digest`));
    const again = planLeadAlerts({ now: monday, roster, onlineUserIds: [], leads: overnight, sent, linkFor });
    expect(again.some((action) => action.step === 'digest')).toBe(false);
  });

  it('gives Saturday-morning leads to the Saturday person', () => {
    const roster = [person('monday-1', 'primary', [1]), person('saturday-1', 'primary', [6], 9 * 60, 13 * 60)];
    const actions = planLeadAlerts({
      now: atRome(2026, 11, 14, 8, 30),
      roster,
      onlineUserIds: [],
      leads: [lead({ createdAt: atRome(2026, 11, 13, 20, 0) })],
      sent: new Set(),
      linkFor,
    });
    expect(actions.find((action) => action.step === 'digest')?.userIds).toEqual(['saturday-1']);
  });

  it('does not put a name, a phone number, or an answer in the alert', () => {
    const answers = {
      A1: 'date_set',
      'close.name': 'Mario Rossi',
      phone: '393331112233',
      B2: 'via Roma 10, vuole un mutuo',
    };
    expect(auctionDateSet('route_auction', answers)).toBe(true);
    const now = atRome(2026, 11, 10, 19, 0);
    const actions = planLeadAlerts({
      now,
      roster: weekday,
      onlineUserIds: [],
      leads: [lead({ createdAt: now, auctionDateSet: true, windowRemainingMs: 23 * 60 * 60 * 1000 })],
      sent: new Set(),
      linkFor,
    });
    const text = actions.map((action) => `${action.subject}\n${action.body}`).join('\n');
    expect(text).toContain('Easy Legenda');
    expect(text).toContain('Asta');
    expect(text).toContain('UR');
    expect(text).toContain('finestra 23h');
    expect(text).not.toContain('Mario Rossi');
    expect(text).not.toContain('393331112233');
    expect(text).not.toContain('via Roma');
    expect(text).not.toContain('mutuo');
    expect(text).not.toContain('date_set');
    expect(alertSubject(lead())).toBe('Nuovo lead WhatsApp · Easy Legenda · Asta · UR · finestra 23h');
  });
});

describe('24-hour detail email', () => {
  const until = '2026-11-11T12:52:00+01:00';

  it('is on only until the deadline', () => {
    expect(detailAlertActive('lead-alerts@example.com', until, new Date('2026-11-10T12:00:00+01:00'))).toBe(true);
    expect(detailAlertActive('lead-alerts@example.com', until, new Date('2026-11-11T12:52:00+01:00'))).toBe(false);
    expect(detailAlertActive('', until, new Date('2026-11-10T12:00:00+01:00'))).toBe(false);
  });

  it('includes the answers and the WhatsApp number', () => {
    const message = leadDetailMessage({
      product: 'easy_casa',
      route: 'route_buy',
      locale: 'it',
      intakeStatus: 'complete',
      contactPref: 'write',
      waId: '393331112233',
      answers: { 'close.name': 'Mario Rossi', B2: 'cerco un bilocale' },
      link: 'https://admin.easycasaita.com/#whatsapp/leads/lead-1',
    });
    expect(message.subject).toContain('Easy Casa');
    expect(message.body).toContain('Mario Rossi');
    expect(message.body).toContain('cerco un bilocale');
    expect(message.body).toContain('+393331112233');
    expect(message.body).toContain('#whatsapp/leads/lead-1');
  });
});
