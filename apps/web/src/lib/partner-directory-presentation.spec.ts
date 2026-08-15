/** EC-S K EC 1.56 — partner directory pilot-desk presentation helpers. */
import { describe, expect, it } from 'vitest';

type DirItem = {
  paidPlacement?: boolean;
  operatorManaged?: boolean;
};

export function allPaidAreOperatorManaged(items: DirItem[]): boolean {
  const paid = items.filter((i) => i.paidPlacement === true);
  if (paid.length === 0) return false;
  return paid.every((i) => i.operatorManaged === true);
}

export function partnerDirectoryBannerKey(items: DirItem[]): string {
  const anyPaid = items.some((i) => i.paidPlacement === true);
  return anyPaid ? 'partnerDirectory.paidListingLabel' : 'partnerDirectory.informationalLabel';
}

describe('partner directory presentation (K EC 1.56)', () => {
  it('keeps informational banner when catalogue is empty', () => {
    expect(partnerDirectoryBannerKey([])).toBe('partnerDirectory.informationalLabel');
    expect(allPaidAreOperatorManaged([])).toBe(false);
  });

  it('keeps paid banner + counsel labels when paid rows exist', () => {
    const pilotPaid = [{ paidPlacement: true, operatorManaged: true }];
    expect(partnerDirectoryBannerKey(pilotPaid)).toBe('partnerDirectory.paidListingLabel');
    expect(allPaidAreOperatorManaged(pilotPaid)).toBe(true);
  });

  it('shows pilot note only when every paid row is operator-managed', () => {
    const mixed = [
      { paidPlacement: true, operatorManaged: true },
      { paidPlacement: true, operatorManaged: false },
    ];
    expect(allPaidAreOperatorManaged(mixed)).toBe(false);

    const allPilot = [
      { paidPlacement: true, operatorManaged: true },
      { paidPlacement: true, operatorManaged: true },
      { paidPlacement: false, operatorManaged: false },
    ];
    expect(allPaidAreOperatorManaged(allPilot)).toBe(true);
  });

  it('does not treat unpaid rows as breaking the pilot-all-paid check', () => {
    const rows = [
      { paidPlacement: false, operatorManaged: false },
      { paidPlacement: true, operatorManaged: true },
    ];
    expect(allPaidAreOperatorManaged(rows)).toBe(true);
  });
});
