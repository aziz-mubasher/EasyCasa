import { describe, expect, it } from 'vitest';

import { initialsFromDisplayName, initialsMatch } from './initials';
import { extractBanks4AllTrackingToken, isPipPlanRefFormat } from './token';

describe('Banks4All token helpers', () => {
  it('extracts last path segment from URL or bare token', () => {
    expect(
      extractBanks4AllTrackingToken(
        'https://portal.banks4all.eu/it/property-plan/track/abcdef0123456789',
      ),
    ).toBe('abcdef0123456789');
    expect(extractBanks4AllTrackingToken('abcdef0123456789')).toBe('abcdef0123456789');
    expect(extractBanks4AllTrackingToken('')).toBeNull();
  });

  it('detects PIP plan refs', () => {
    expect(isPipPlanRefFormat('PIP-2026-00002')).toBe(true);
    expect(isPipPlanRefFormat('abcdef0123456789')).toBe(false);
  });
});

describe('Banks4All initials', () => {
  it('derives M.R. from display name', () => {
    expect(initialsFromDisplayName('Mario Rossi')).toBe('M.R.');
    expect(initialsMatch('M.R.', 'Mario Rossi')).toBe(true);
    expect(initialsMatch('M.R.', 'Luigi Bianchi')).toBe(false);
  });
});
