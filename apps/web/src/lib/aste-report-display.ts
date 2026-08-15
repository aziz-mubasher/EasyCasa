/**
 * EC-24-VERIFY — pure display helpers for Aste report OMI / economics rows.
 * Shared by AsteReportPage and contract tests (EC-27 teaser must reuse these).
 */

export function formatReportMoney(
  n: number | null | undefined,
  locale: 'it' | 'en' | 'es',
): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const intlLocale =
    locale === 'en' ? 'en-GB' : locale === 'es' ? 'es-ES' : 'it-IT';
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Mirrors AsteReportPage OMI sconto row — null → em dash (not 0%). */
export function formatOmiScontoRealePct(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return '—';
  return `${pct}%`;
}

/** Economics figure missing → localized "non rilevato" copy key resolved by caller. */
export function isEconFieldPresent(
  fig: { value: number; source: { file: string; page: number } } | null | undefined,
): boolean {
  return fig != null && Number.isFinite(fig.value);
}

/** OMI zone band still renderable when stima absent — only needs range mid. */
export function omiHeadlineRenderable(omi: {
  available: boolean;
  omi_range: { min: number; max: number; mid: number } | null;
} | null): boolean {
  return Boolean(omi?.available && omi.omi_range && Number.isFinite(omi.omi_range.mid));
}
