import { cedolareRateFor, LEASE_RULES } from './lease';
import type {
  LeaseInput,
  RegistrationTaxes,
  RliAdempimento,
  RliPayload,
} from './types';

const REGISTRO_MIN_CENTS = 6700; // €67 minimum, first annuity
const REGISTRO_RATE = 0.02; // 2% of annual rent
const CONCORDATO_BASE_FACTOR = 0.7; // registro base = 70% of rent in high-tension concordato
const BOLLO_PER_UNIT_CENTS = 1600; // €16 per 4 written sides, per copy

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Registration deadline: within 30 days of the earlier of signing or start,
 * for residential leases over 30 days.
 */
export function registrationDeadline(input: Pick<LeaseInput, 'startAt' | 'signedAt'>): string {
  const start = new Date(input.startAt).getTime();
  const signed = input.signedAt ? new Date(input.signedAt).getTime() : Number.POSITIVE_INFINITY;
  const anchor = Math.min(start, signed);
  return addDays(new Date(anchor).toISOString(), 30);
}

/**
 * Registration taxes. Cedolare secca waives both registro and bollo. Otherwise
 * registro is 2% of the annual rent (min €67 for the first annuity; on 70% of
 * rent for concordato in a high-tension municipality), plus stamp duty.
 */
export function computeRegistrationTaxes(
  input: LeaseInput,
  opts: { writtenSides?: number; copies?: number } = {},
): RegistrationTaxes {
  if (input.cedolareSecca) {
    return {
      cedolare: true,
      registroCents: 0,
      bolloCents: 0,
      totalCents: 0,
      note: 'Cedolare secca waives imposta di registro and imposta di bollo.',
    };
  }

  const rule = LEASE_RULES[input.type];
  const concordatoReduced = rule.concordato && input.highTension;
  const base = concordatoReduced
    ? Math.round(input.annualRentCents * CONCORDATO_BASE_FACTOR)
    : input.annualRentCents;

  const registroRaw = Math.round(base * REGISTRO_RATE);
  const registroCents = Math.max(registroRaw, REGISTRO_MIN_CENTS);

  const sides = opts.writtenSides ?? 4;
  const copies = opts.copies ?? 2;
  const bolloCents = BOLLO_PER_UNIT_CENTS * Math.ceil(sides / 4) * copies;

  return {
    cedolare: false,
    registroCents,
    bolloCents,
    totalCents: registroCents + bolloCents,
    note: concordatoReduced
      ? 'Ordinary regime; registro on 70% base (concordato, high-tension).'
      : 'Ordinary regime; registro 2% of annual rent (min €67), plus bollo.',
  };
}

/**
 * Build the validated RLI payload for the Agenzia delle Entrate. This is the
 * structured intermediate; the actual telematic submission goes through an
 * authorised channel (Entratel/RLI-web) — see RliChannel port.
 */
export function buildRliPayload(
  input: LeaseInput,
  adempimento: RliAdempimento = 'REGISTRAZIONE',
  taxOpts?: { writtenSides?: number; copies?: number },
): RliPayload {
  return {
    adempimento,
    leaseType: input.type,
    startAt: input.startAt,
    durationMonths: input.durationMonths,
    annualRentCents: input.annualRentCents,
    cedolareSecca: input.cedolareSecca,
    cedolareRate: cedolareRateFor(input),
    registrationDeadline: registrationDeadline(input),
    taxes: computeRegistrationTaxes(input, taxOpts),
  };
}
