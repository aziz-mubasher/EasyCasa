/**
 * EC-WA-ALERTS-1 ladder. Pure: no email, no WhatsApp, no database.
 * Real-time alerts are allowed from 06:00 inclusive to 22:00 exclusive, Europe/Rome.
 * AZM set that window on 10 Nov 2026. Nothing is sent from 22:00 to 06:00.
 * Staff alerts are email and in-admin only. No staff WhatsApp template.
 */

export const ALERT_OPEN_MIN = 6 * 60;
export const ALERT_CLOSE_MIN = 22 * 60;
export const ROME = 'Europe/Rome';

export type AlertRole = 'primary' | 'backup' | 'owner';

export type DutyWindow = {
  userId: string;
  role: AlertRole;
  /** ISO weekday: 1 Monday … 7 Sunday. */
  days: number[];
  startMin: number;
  endMin: number;
  active: boolean;
};

export type AlertLead = {
  id: string;
  status: 'new' | 'assigned' | 'contacted' | 'closed';
  product: string;
  route: string;
  locale: string;
  createdAt: Date;
  assignedAt: Date | null;
  ownerUserId: string | null;
  openedAt: Date | null;
  contactedAt: Date | null;
  windowRemainingMs: number | null;
  auctionDateSet: boolean;
};

export type PlannedAlert = {
  step: string;
  channel: 'in_app' | 'email' | 'digest';
  leadIds: string[];
  userIds: string[];
  subject: string;
  body: string;
};

const WEEKDAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const PRODUCT: Record<string, string> = {
  easy_casa: 'Easy Casa',
  easy_legenda: 'Easy Legenda',
};
const ROUTE: Record<string, string> = {
  route_buy: 'Acquisto',
  route_sell: 'Vendita',
  route_auction: 'Asta',
  route_other: 'Altro',
  route_human: 'Persona',
};
const LOCALES = new Set(['it', 'en', 'es', 'hi', 'ur', 'pa', 'bn', 'ar']);

export function romeParts(at: Date): { weekday: number; minutes: number; year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROME,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    weekday: WEEKDAY[get('weekday')] ?? 0,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
  };
}

/** Civil time in Europe/Rome, including summer time. */
export function atRome(year: number, month: number, day: number, hour: number, minute: number): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ROME,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcGuess));
  const n = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return new Date(utcGuess - (asUtc - utcGuess));
}

export function inAlertWindow(at: Date): boolean {
  const { minutes } = romeParts(at);
  return minutes >= ALERT_OPEN_MIN && minutes < ALERT_CLOSE_MIN;
}

export function onDuty(member: DutyWindow, at: Date): boolean {
  if (!member.active || !inAlertWindow(at)) return false;
  const wall = romeParts(at);
  if (!member.days.includes(wall.weekday)) return false;
  return wall.minutes >= member.startMin && wall.minutes < member.endMin;
}

export function covered(roster: readonly DutyWindow[], at: Date): boolean {
  return roster.some((member) => onDuty(member, at));
}

export function workingMinutes(roster: readonly DutyWindow[], from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  let minutes = 0;
  const cursor = new Date(from.getTime());
  while (cursor.getTime() < to.getTime()) {
    const step = Math.min(60_000, to.getTime() - cursor.getTime());
    if (covered(roster, cursor)) minutes += step / 60_000;
    cursor.setTime(cursor.getTime() + step);
  }
  return minutes;
}

export function auctionDateSet(route: string, answers: unknown): boolean {
  if (route !== 'route_auction' || !answers || typeof answers !== 'object') return false;
  return (answers as Record<string, unknown>).A1 === 'date_set';
}

export function alertSubject(lead: AlertLead): string {
  const parts = ['Nuovo lead WhatsApp'];
  const product = PRODUCT[lead.product];
  const route = ROUTE[lead.route];
  if (product) parts.push(product);
  if (route) parts.push(route);
  if (LOCALES.has(lead.locale)) parts.push(lead.locale.toUpperCase());
  if (lead.windowRemainingMs != null) {
    const hours = Math.max(0, Math.floor(lead.windowRemainingMs / 3_600_000));
    parts.push(`finestra ${hours}h`);
  }
  return parts.join(' · ');
}

function addDays(year: number, month: number, day: number, offset: number): { y: number; m: number; d: number } {
  const next = new Date(Date.UTC(year, month - 1, day + offset));
  return { y: next.getUTCFullYear(), m: next.getUTCMonth() + 1, d: next.getUTCDate() };
}

function morningPerson(member: DutyWindow, weekday: number): boolean {
  return member.active && member.days.includes(weekday) && member.startMin < 12 * 60 && member.endMin > member.startMin;
}

/** Next 08:30 Europe/Rome on a day someone covers the morning. Null when the roster never does. */
export function ladderStart(createdAt: Date, roster: readonly DutyWindow[]): Date | null {
  if (covered(roster, createdAt)) return createdAt;
  const wall = romeParts(createdAt);
  for (let offset = 0; offset < 10; offset += 1) {
    const day = addDays(wall.year, wall.month, wall.day, offset);
    const at = atRome(day.y, day.m, day.d, 8, 30);
    if (at.getTime() <= createdAt.getTime()) continue;
    const target = romeParts(at);
    if (roster.some((member) => morningPerson(member, target.weekday))) return at;
  }
  return null;
}

function sentKey(leadId: string, step: string): string {
  return `${leadId}:${step}`;
}

function dutyIds(roster: readonly DutyWindow[], at: Date, role: AlertRole): string[] {
  return roster.filter((member) => member.role === role && onDuty(member, at)).map((member) => member.userId);
}

function owners(roster: readonly DutyWindow[]): string[] {
  const ids = roster.filter((member) => member.active && member.role === 'owner').map((member) => member.userId);
  if (ids.length > 0) return ids;
  return roster.filter((member) => member.active && member.role === 'primary').map((member) => member.userId);
}

function emailAction(step: string, leads: readonly AlertLead[], userIds: string[], linkFor: (id: string) => string): PlannedAlert {
  const lead = leads[0]!;
  return {
    step,
    channel: 'email',
    leadIds: leads.map((item) => item.id),
    userIds,
    subject: step === 'window_urgent' ? `Urgente · ${alertSubject(lead)}` : alertSubject(lead),
    body: `Apri il lead:\n${linkFor(lead.id)}\n`,
  };
}

export function planLeadAlerts(input: {
  now: Date;
  roster: readonly DutyWindow[];
  onlineUserIds: readonly string[];
  leads: readonly AlertLead[];
  sent: ReadonlySet<string>;
  linkFor: (leadId: string) => string;
}): PlannedAlert[] {
  if (!inAlertWindow(input.now)) return [];
  const actions: PlannedAlert[] = [];
  const digestLeads: AlertLead[] = [];

  for (const lead of input.leads) {
    if (lead.status === 'closed' || lead.status === 'contacted' || lead.contactedAt) continue;
    if (lead.windowRemainingMs != null && lead.windowRemainingMs <= 0) continue;

    if (lead.status === 'assigned') {
      if (
        lead.assignedAt &&
        lead.ownerUserId &&
        workingMinutes(input.roster, lead.assignedAt, input.now) >= 240 &&
        !input.sent.has(sentKey(lead.id, 'assign_4h'))
      ) {
        actions.push(emailAction('assign_4h', [lead], [lead.ownerUserId], input.linkFor));
      }
      if (
        lead.windowRemainingMs != null &&
        lead.windowRemainingMs <= 4 * 60 * 60 * 1000 &&
        !input.sent.has(sentKey(lead.id, 'window_urgent'))
      ) {
        const ids = new Set<string>(owners(input.roster));
        if (lead.ownerUserId) ids.add(lead.ownerUserId);
        if (ids.size > 0) actions.push(emailAction('window_urgent', [lead], [...ids], input.linkFor));
      }
      continue;
    }

    if (lead.status !== 'new' || lead.openedAt) continue;

    const outside =
      !covered(input.roster, lead.createdAt) && !covered(input.roster, input.now);
    if (lead.auctionDateSet && outside && !input.sent.has(sentKey(lead.id, 'auction_exception'))) {
      const ids = owners(input.roster);
      if (ids.length > 0) actions.push(emailAction('auction_exception', [lead], ids, input.linkFor));
    }

    const start = ladderStart(lead.createdAt, input.roster);
    if (!start || input.now.getTime() < start.getTime()) continue;
    const minutes = workingMinutes(input.roster, start, input.now);
    const createdInHours = covered(input.roster, lead.createdAt);
    const onlineKey = sentKey(lead.id, 'online_t0');
    const offlineKey = sentKey(lead.id, 'offline_t0');
    const digestKey = sentKey(lead.id, 'digest');

    if (!createdInHours) {
      const pathOnline = input.sent.has(onlineKey);
      if (!input.sent.has(digestKey) && !pathOnline) digestLeads.push(lead);
      if (input.onlineUserIds.length > 0 && !input.sent.has(digestKey) && !input.sent.has(onlineKey)) {
        actions.push({
          step: 'online_t0',
          channel: 'in_app',
          leadIds: [lead.id],
          userIds: [...input.onlineUserIds],
          subject: alertSubject(lead),
          body: `Apri il lead:\n${input.linkFor(lead.id)}\n`,
        });
      }
      if (
        (pathOnline || (input.onlineUserIds.length > 0 && !input.sent.has(digestKey))) &&
        input.sent.has(onlineKey) &&
        minutes >= 15 &&
        !input.sent.has(sentKey(lead.id, 'primary_15'))
      ) {
        const ids = dutyIds(input.roster, input.now, 'primary');
        if (ids.length > 0) actions.push(emailAction('primary_15', [lead], ids, input.linkFor));
      }
      if (
        input.sent.has(digestKey) &&
        minutes >= 30 &&
        !input.sent.has(sentKey(lead.id, 'backup_30'))
      ) {
        const ids = dutyIds(input.roster, input.now, 'backup');
        if (ids.length > 0) actions.push(emailAction('backup_30', [lead], ids, input.linkFor));
      }
    } else if (input.onlineUserIds.length > 0 || input.sent.has(onlineKey)) {
      if (!input.sent.has(onlineKey) && input.onlineUserIds.length > 0) {
        actions.push({
          step: 'online_t0',
          channel: 'in_app',
          leadIds: [lead.id],
          userIds: [...input.onlineUserIds],
          subject: alertSubject(lead),
          body: `Apri il lead:\n${input.linkFor(lead.id)}\n`,
        });
      }
      if (input.sent.has(onlineKey) && minutes >= 15 && !input.sent.has(sentKey(lead.id, 'primary_15'))) {
        const ids = dutyIds(input.roster, input.now, 'primary');
        if (ids.length > 0) actions.push(emailAction('primary_15', [lead], ids, input.linkFor));
      }
    } else if (!input.sent.has(offlineKey)) {
      const ids = dutyIds(input.roster, input.now, 'primary');
      if (ids.length > 0) actions.push(emailAction('offline_t0', [lead], ids, input.linkFor));
    } else if (minutes >= 30 && !input.sent.has(sentKey(lead.id, 'backup_30'))) {
      const ids = dutyIds(input.roster, input.now, 'backup');
      if (ids.length > 0) actions.push(emailAction('backup_30', [lead], ids, input.linkFor));
    }

    const pathStarted =
      input.sent.has(onlineKey) || input.sent.has(offlineKey) || input.sent.has(digestKey);
    if (pathStarted && minutes >= 120 && !input.sent.has(sentKey(lead.id, 'owner_2h'))) {
      const ids = owners(input.roster);
      if (ids.length > 0) actions.push(emailAction('owner_2h', [lead], ids, input.linkFor));
    }
  }

  if (digestLeads.length > 0 && input.onlineUserIds.length === 0) {
    const wall = romeParts(input.now);
    const recipients = input.roster.filter((member) => morningPerson(member, wall.weekday));
    if (recipients.length > 0) {
      const lines = digestLeads.map((lead) => `${alertSubject(lead)}\n${input.linkFor(lead.id)}`);
      actions.push({
        step: 'digest',
        channel: 'digest',
        leadIds: digestLeads.map((lead) => lead.id),
        userIds: recipients.map((member) => member.userId),
        subject: `Lead WhatsApp in coda · ${digestLeads.length}`,
        body: `${lines.join('\n')}\n`,
      });
    }
  }

  return actions;
}
