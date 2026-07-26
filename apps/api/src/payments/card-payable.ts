/** Gross cents chargeable by card (fixed + bundle + IVA thereon). Excludes provvigione and passthrough. */
export function cardPayableGrossCents(
  lines: ReadonlyArray<{ kind: string; grossCents: number; ivaCents: number; netCents: number }>,
): number {
  let total = 0;
  for (const line of lines) {
    if (line.kind === 'provvigione' || line.kind === 'passthrough') continue;
    total += line.grossCents;
  }
  return total;
}
