export function euro(n: number | null | undefined, locale = 'it-IT'): string {
  if (n == null) return '—';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
export function area(n: number | null | undefined): string {
  return n == null ? '—' : `${new Intl.NumberFormat('it-IT').format(n)} m²`;
}
