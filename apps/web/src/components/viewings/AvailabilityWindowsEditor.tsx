'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  DEFAULT_LISTING_TIMEZONE,
  DEFAULT_SCHEDULING_CONFIG,
  generateSlots,
  weeklyHours,
  type AvailabilityWindow,
} from '@easycasa/shared';

import { formatRomeTime } from '@/lib/viewing-time';

const DAY_MS = 86_400_000;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const; // Mon…Sun display order

function minutesToInput(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function inputToMinutes(v: string): number {
  const [h, m] = v.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

type Props = {
  windows: AvailabilityWindow[];
  onChange: (windows: AvailabilityWindow[]) => void;
  /** When true, show live slot preview via shared generateSlots. */
  showPreview?: boolean;
  /** Fixed "now" for deterministic previews in tests. */
  nowMs?: number;
};

export function AvailabilityWindowsEditor({
  windows,
  onChange,
  showPreview = true,
  nowMs,
}: Props) {
  const t = useTranslations('availability');
  const locale = useLocale();

  const byWeekday = useMemo(() => {
    const map = new Map<number, AvailabilityWindow | null>();
    for (const d of WEEKDAYS) map.set(d, null);
    for (const w of windows) map.set(w.weekday, w);
    return map;
  }, [windows]);

  const preview = useMemo(() => {
    if (!showPreview || windows.length === 0) return [];
    const now = nowMs ?? Date.now();
    return generateSlots(windows, {
      fromMs: now,
      toMs: now + DEFAULT_SCHEDULING_CONFIG.maxHorizonDays * DAY_MS,
      slotMinutes: DEFAULT_SCHEDULING_CONFIG.slotMinutes,
      bufferMinutes: DEFAULT_SCHEDULING_CONFIG.bufferMinutes,
      existing: [],
      nowMs: now,
      minLeadMinutes: DEFAULT_SCHEDULING_CONFIG.minLeadMinutes,
      timeZone: DEFAULT_LISTING_TIMEZONE,
    }).slice(0, 12);
  }, [windows, showPreview, nowMs]);

  function toggleDay(weekday: number, enabled: boolean) {
    if (enabled) {
      const existing = windows.find((w) => w.weekday === weekday);
      if (existing) return;
      const fallback =
        weekday === 6
          ? { weekday, startMinutes: 10 * 60, endMinutes: 13 * 60 }
          : { weekday, startMinutes: 18 * 60, endMinutes: 20 * 60 };
      onChange([...windows, fallback].sort((a, b) => a.weekday - b.weekday));
    } else {
      onChange(windows.filter((w) => w.weekday !== weekday));
    }
  }

  function patchDay(weekday: number, patch: Partial<AvailabilityWindow>) {
    onChange(
      windows.map((w) => (w.weekday === weekday ? { ...w, ...patch } : w)),
    );
  }

  const hours = weeklyHours(windows);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('timezoneNote')}</p>
      <p className="text-sm text-muted">{t('skipConsequence')}</p>

      <ul className="space-y-3">
        {WEEKDAYS.map((weekday) => {
          const w = byWeekday.get(weekday);
          const on = Boolean(w);
          return (
            <li
              key={weekday}
              className="flex flex-wrap items-center gap-3 border-b border-line pb-3 last:border-0"
            >
              <label className="flex items-center gap-2 min-w-[7rem]">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => toggleDay(weekday, e.target.checked)}
                />
                <span className="text-sm font-medium">{t(`weekday.${weekday}`)}</span>
              </label>
              {on && w ? (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    className="rounded border border-line px-2 py-1"
                    value={minutesToInput(w.startMinutes)}
                    onChange={(e) =>
                      patchDay(weekday, { startMinutes: inputToMinutes(e.target.value) })
                    }
                  />
                  <span className="text-muted">–</span>
                  <input
                    type="time"
                    className="rounded border border-line px-2 py-1"
                    value={minutesToInput(w.endMinutes)}
                    onChange={(e) =>
                      patchDay(weekday, { endMinutes: inputToMinutes(e.target.value) })
                    }
                  />
                </div>
              ) : (
                <span className="text-sm text-muted">{t('dayOff')}</span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted">
        {t('weeklyHours', { hours: hours.toFixed(1) })} · {t('windowCount', { count: windows.length })}
      </p>

      {showPreview && (
        <div className="rounded-lg bg-sand/40 p-4">
          <p className="text-sm font-medium mb-2">{t('previewTitle')}</p>
          {preview.length === 0 ? (
            <p className="text-sm text-muted">{t('previewEmpty')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {preview.map((s) => {
                const day = new Intl.DateTimeFormat(locale, {
                  weekday: 'short',
                  day: 'numeric',
                  timeZone: DEFAULT_LISTING_TIMEZONE,
                }).format(new Date(s.startMs));
                return (
                  <li
                    key={s.startMs}
                    className="rounded-full border border-line bg-white px-3 py-1 text-sm"
                  >
                    {day} · {formatRomeTime(s.startMs, locale)}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
