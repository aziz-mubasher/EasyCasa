import { parsePreferredTime, slotInWindow } from './phrase';
import { addRomeDays, romeDateKey, romeMinutes, romeParts, romeToUtc } from './rome';

export type WeeklyRange = { weekday: number; startMin: number; endMin: number };

export type TimeOff = {
  startDate: string;
  endDate: string;
  /** Null means every day in the date range. Otherwise only these ISO weekdays. */
  weekdays: number[] | null;
};

export type AvailProfile = {
  id: string;
  name: string;
  callbackMin: number;
  gapMin: number;
  maxPerDay: number | null;
  earliestMin: number;
  weekly: WeeklyRange[];
  timeOff: TimeOff[];
};

export type BusyBlock = { profileId: string; start: Date; end: Date };

export type SuggestedSlot = {
  start: string;
  end: string;
  profileId: string;
  reason: string;
  backup: boolean;
};

function dateKey(p: { year: number; month: number; day: number }): string {
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function isOff(profile: AvailProfile, day: { year: number; month: number; day: number; weekday: number }): boolean {
  const key = dateKey(day);
  return profile.timeOff.some((off) => {
    if (key < off.startDate || key > off.endDate) return false;
    if (!off.weekdays || off.weekdays.length === 0) return true;
    return off.weekdays.includes(day.weekday);
  });
}

function overlaps(start: Date, endWithGap: Date, busy: BusyBlock[]): boolean {
  return busy.some((b) => start.getTime() < b.end.getTime() && endWithGap.getTime() > b.start.getTime());
}

export function freeSlots(
  profile: AvailProfile,
  busy: BusyBlock[],
  now: Date,
  limit: number,
  horizonDays = 14,
): Array<{ start: Date; end: Date }> {
  const earliest = now.getTime() + profile.earliestMin * 60_000;
  const mine = busy.filter((b) => b.profileId === profile.id);
  const out: Array<{ start: Date; end: Date }> = [];
  const perDay = new Map<string, number>();
  for (const b of mine) {
    const key = romeDateKey(b.start);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const cursor = romeParts(now);
  for (let d = 0; d < horizonDays && out.length < limit; d += 1) {
    const day = d === 0 ? cursor : addRomeDays(cursor.year, cursor.month, cursor.day, d);
    if (isOff(profile, day)) continue;
    const key = dateKey(day);
    const ranges = profile.weekly.filter((r) => r.weekday === day.weekday);
    for (const range of ranges) {
      let min = range.startMin;
      while (min + profile.callbackMin <= range.endMin && out.length < limit) {
        const start = romeToUtc(day.year, day.month, day.day, Math.floor(min / 60), min % 60);
        const end = new Date(start.getTime() + profile.callbackMin * 60_000);
        const endWithGap = new Date(end.getTime() + profile.gapMin * 60_000);
        const blocked =
          start.getTime() < earliest ||
          overlaps(start, endWithGap, mine.map((b) => ({ ...b, end: new Date(b.end.getTime() + profile.gapMin * 60_000) }))) ||
          (profile.maxPerDay != null && (perDay.get(key) ?? 0) >= profile.maxPerDay);
        if (!blocked) {
          out.push({ start, end });
          perDay.set(key, (perDay.get(key) ?? 0) + 1);
        }
        min += profile.callbackMin;
      }
    }
  }
  return out;
}

export function suggestSlots(input: {
  owner: AvailProfile;
  backup: AvailProfile | null;
  busy: BusyBlock[];
  words: string | null;
  now: Date;
  limit?: number;
}): SuggestedSlot[] {
  const limit = input.limit ?? 3;
  const window = parsePreferredTime(input.words, input.now);
  const windowDay = window ? romeParts(window.start) : null;
  const ownerOff = windowDay ? isOff(input.owner, windowDay) : false;
  const primary = ownerOff && input.backup ? input.backup : input.owner;
  const backup = ownerOff && input.backup != null;
  const pool = freeSlots(primary, input.busy, input.now, 24);
  const ranked = window
    ? [...pool.filter((s) => slotInWindow(s.start, window)), ...pool.filter((s) => !slotInWindow(s.start, window))]
    : pool;
  const reasonOff = `Backup — ${input.owner.name} is off`;
  return ranked.slice(0, limit).map((s, index) => ({
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    profileId: primary.id,
    backup,
    reason: backup
      ? reasonOff
      : window && index < pool.filter((x) => slotInWindow(x.start, window)).length
        ? 'Inside the requested time'
        : 'Next free',
  }));
}

export function romeSlotLabel(startIso: string): string {
  const p = romeParts(new Date(startIso));
  const names = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hh = String(p.hour).padStart(2, '0');
  const mm = String(p.minute).padStart(2, '0');
  return `${names[p.weekday]} ${p.day}/${p.month} ${hh}:${mm}`;
}

export { romeMinutes };
