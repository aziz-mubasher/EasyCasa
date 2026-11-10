/** EC-WA-INTAKE-2 rules that do not send WhatsApp. */

export const WINDOW_MS = 24 * 60 * 60 * 1000;
export const CALL_DURATION_MIN = 15;
export const SLOT_NOTICE_MS = 4 * 60 * 60 * 1000;
export const REMINDER_BEFORE_MS = 2 * 60 * 60 * 1000;
export const REMINDER_SLACK_MS = 30 * 60 * 1000;

export const LEAD_STATUSES = ['new', 'assigned', 'contacted', 'closed'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const CLOSED_REASONS = ['no_reply', 'not_our_service', 'handed_to_professional', 'completed'] as const;
export type ClosedReason = (typeof CLOSED_REASONS)[number];
export const CALL_STATUSES = ['requested', 'confirmed', 'offered_other', 'done', 'cancelled', 'no_show'] as const;

export function windowOpen(lastInboundAt: Date, now: Date): boolean {
  return now.getTime() < lastInboundAt.getTime() + WINDOW_MS;
}

export function assertFreeTextAllowed(lastInboundAt: Date | null, now: Date): void {
  if (!lastInboundAt || !windowOpen(lastInboundAt, now)) {
    throw new Error('customer service window is closed — free-form reply not allowed');
  }
}

export function closePatch(reason: string | null | undefined): { closedReason: ClosedReason } {
  if (!reason || !(CLOSED_REASONS as readonly string[]).includes(reason)) {
    throw new Error('closed requires a reason');
  }
  return { closedReason: reason as ClosedReason };
}

export function assertCallShape(durationMin: number, callLanguage: string, staffed: readonly string[]): void {
  if (durationMin !== CALL_DURATION_MIN) throw new Error('duration_min must be 15');
  if (!staffed.includes(callLanguage)) throw new Error('call_language must be a staffed locale');
}

export type SlotProblem = 'notice' | 'hours' | 'overlap';

function romeParts(slot: Date): { weekday: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(slot);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return { weekday: get('weekday'), hour: Number(get('hour')), minute: Number(get('minute')) };
}

/** Monday–Friday, start 09:00 inclusive, call ends by 18:00 Europe/Rome. */
export function slotProblem(
  slot: Date,
  now: Date,
  otherStarts: Date[] = [],
): SlotProblem | null {
  if (Number.isNaN(slot.getTime())) return 'hours';
  if (slot.getTime() - now.getTime() < SLOT_NOTICE_MS) return 'notice';
  const { weekday, hour, minute } = romeParts(slot);
  const weekend = weekday === 'Sat' || weekday === 'Sun';
  const minutes = hour * 60 + minute;
  const open = 9 * 60;
  const lastStart = 18 * 60 - CALL_DURATION_MIN;
  if (weekend || minutes < open || minutes > lastStart) return 'hours';
  const end = slot.getTime() + CALL_DURATION_MIN * 60 * 1000;
  for (const other of otherStarts) {
    const otherEnd = other.getTime() + CALL_DURATION_MIN * 60 * 1000;
    if (slot.getTime() < otherEnd && end > other.getTime()) return 'overlap';
  }
  return null;
}

export function reminderDue(input: {
  status: string;
  slot: Date | null;
  reminderSentAt: Date | null;
  now: Date;
}): boolean {
  if (input.status !== 'confirmed' || !input.slot || input.reminderSentAt) return false;
  const delta = input.slot.getTime() - input.now.getTime();
  return delta >= REMINDER_BEFORE_MS - REMINDER_SLACK_MS && delta <= REMINDER_BEFORE_MS + REMINDER_SLACK_MS;
}

export function chooseTemplateLocale(
  customerLocale: string,
  approvedLocales: readonly string[],
): string | null {
  if (approvedLocales.includes(customerLocale)) return customerLocale;
  if (customerLocale !== 'en' && approvedLocales.includes('en')) return 'en';
  return null;
}

/** Working minutes between two instants, Monday–Friday 09:00–18:00 Europe/Rome. */
export function workingMinutes(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  let minutes = 0;
  const cursor = new Date(from.getTime());
  while (cursor.getTime() < to.getTime()) {
    const { weekday, hour } = romeParts(cursor);
    const open = weekday !== 'Sat' && weekday !== 'Sun' && hour >= 9 && hour < 18;
    const step = Math.min(60 * 1000, to.getTime() - cursor.getTime());
    if (open) minutes += step / 60000;
    cursor.setTime(cursor.getTime() + step);
  }
  return minutes;
}
