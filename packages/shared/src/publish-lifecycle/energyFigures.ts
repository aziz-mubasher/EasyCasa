/**
 * R4 — domain invariant: a listing cannot become `published` without both
 * energy figures (class letter + index in kWh/m²·year).
 *
 * Art. 6 c. 8 D.lgs. 192/2005 (penalty art. 15). Not an input `required`
 * flag — every publish path must call this before writing `published`.
 *
 * [[BUCO: elenco cause di esenzione APE]] — explicit enum, never `null`.
 * Until counsel lists the exemptions, absence of figures is a hard block.
 */

export class PublishEnergyFiguresError extends Error {
  readonly code = 'ENERGY_FIGURES_REQUIRED' as const;

  constructor(
    message = 'energy class and energy performance index are required to publish',
  ) {
    super(message);
    this.name = 'PublishEnergyFiguresError';
  }
}

export type PublishEnergyFiguresInput = {
  energyClass?: string | null;
  energyPerformanceKwhM2Y?: number | string | null;
};

export function hasPublishEnergyFigures(input: PublishEnergyFiguresInput): boolean {
  const cls = typeof input.energyClass === 'string' ? input.energyClass.trim() : '';
  const raw = input.energyPerformanceKwhM2Y;
  const index =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && raw.trim() !== ''
        ? Number(raw)
        : Number.NaN;
  return cls.length > 0 && Number.isFinite(index) && index > 0;
}

export function assertPublishEnergyFigures(input: PublishEnergyFiguresInput): void {
  if (!hasPublishEnergyFigures(input)) {
    throw new PublishEnergyFiguresError();
  }
}
