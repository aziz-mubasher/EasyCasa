const CLASS_TONE: Record<string, string> = {
  A4: 'bg-emerald-700 text-paper',
  A3: 'bg-emerald-600 text-paper',
  A2: 'bg-emerald-500 text-paper',
  A1: 'bg-lime-600 text-paper',
  B: 'bg-lime-500 text-ink',
  C: 'bg-yellow-400 text-ink',
  D: 'bg-amber-400 text-ink',
  E: 'bg-orange-400 text-ink',
  F: 'bg-orange-600 text-paper',
  G: 'bg-red-700 text-paper',
};

const SCALE = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

export function EnergyClassBadge({
  energyClass,
  performanceKwh,
  label,
  performanceLabel,
  note,
  variant = 'compact',
}: {
  energyClass: string;
  performanceKwh?: number | null;
  label: string;
  performanceLabel: string;
  note?: string;
  /** compact = sidebar chip; panel = Details-tab APE graphic */
  variant?: 'compact' | 'panel';
}) {
  const key = energyClass.toUpperCase();
  const tone = CLASS_TONE[key] ?? 'bg-sand text-ink border border-line';

  if (variant === 'panel') {
    return (
      <div className="rounded-xl2 border border-line bg-paper p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-6">
          <div className="flex-1 min-w-0">
            <p className="eyebrow mb-2">{label}</p>
            <div className="flex flex-wrap items-end gap-4">
              <span
                className={`inline-flex min-w-[4.5rem] justify-center rounded-xl px-4 py-3 font-mono text-3xl font-semibold ${tone}`}
              >
                {key}
              </span>
              {performanceKwh != null && performanceLabel ? (
                <p className="data text-sm text-muted max-w-xs leading-snug">{performanceLabel}</p>
              ) : null}
            </div>
            {note ? <p className="mt-4 text-xs text-muted leading-relaxed">{note}</p> : null}
          </div>
          <div
            className="flex sm:flex-col gap-1 w-full sm:w-14 shrink-0"
            role="img"
            aria-label={`${label}: ${key}`}
          >
            {SCALE.map((c) => {
              const active = c === key;
              return (
                <div
                  key={c}
                  className={`relative flex-1 sm:flex-none sm:h-7 rounded-md ${CLASS_TONE[c]} ${
                    active ? 'ring-2 ring-ink ring-offset-2 scale-[1.03]' : 'opacity-40'
                  } transition`}
                >
                  <span
                    className={`absolute inset-0 grid place-items-center font-mono text-[10px] font-medium ${
                      ['B', 'C', 'D', 'E'].includes(c) ? 'text-ink' : 'text-paper'
                    }`}
                  >
                    {c}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="eyebrow mb-2">{label}</p>
      <div className="flex flex-wrap items-end gap-3">
        <span
          className={`inline-flex min-w-[3rem] justify-center rounded-lg px-3 py-2 font-mono text-lg font-medium ${tone}`}
        >
          {key}
        </span>
        {performanceKwh != null && performanceLabel ? (
          <p className="data text-sm text-muted">{performanceLabel}</p>
        ) : null}
      </div>
      <div className="mt-3 flex gap-0.5" aria-hidden>
        {SCALE.map((c) => (
          <span
            key={c}
            className={`h-1.5 flex-1 rounded-sm ${CLASS_TONE[c] ?? 'bg-line'} ${
              c === key ? 'ring-2 ring-ink ring-offset-1' : 'opacity-35'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
