/**
 * Format B4A `band_max_cents` for owner-facing UI/email.
 * 32_500_000 cents → €325.000 (it-IT) / €325,000 (en) — never treat cents as euros.
 */
export function formatBandMaxCentsEuro(cents: number, locale = 'it-IT'): string {
  const euros = Math.round(cents / 100);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(euros);
  } catch {
    return `€${euros.toLocaleString('it-IT')}`;
  }
}
