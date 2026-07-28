import { describe, expect, it } from 'vitest';

import {
  buildHolderInitials,
  initialsFromDisplayName,
  initialsMatch,
  normalizeInitials,
} from './initials';
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

/**
 * EC-3 §1 — must match B4A `buildPublicPipClientInitials`.
 * Particle rule: surname initial = first letter of the full surname string.
 */
const FIXTURES: Array<{
  label: string;
  firstName: string;
  lastName: string;
  expected: string;
  displayName: string;
}> = [
  {
    label: 'lowercase surname (live account)',
    firstName: 'Muba',
    lastName: 'aziz',
    expected: 'M.A.',
    displayName: 'Muba aziz',
  },
  {
    label: 'two-part surname particle De',
    firstName: 'Marco',
    lastName: 'De Luca',
    expected: 'M.D.',
    displayName: 'Marco De Luca',
  },
  {
    label: 'particle Di',
    firstName: 'Anna',
    lastName: 'Di Marco',
    expected: 'A.D.',
    displayName: 'Anna Di Marco',
  },
  {
    label: 'apostrophe',
    firstName: 'Luca',
    lastName: "D'Angelo",
    expected: 'L.D.',
    displayName: "Luca D'Angelo",
  },
  {
    label: 'particle Lo',
    firstName: 'Sofia',
    lastName: 'Lo Russo',
    expected: 'S.L.',
    displayName: 'Sofia Lo Russo',
  },
  {
    label: 'diacritics',
    firstName: 'Nicolò',
    lastName: 'Martì',
    expected: 'N.M.',
    displayName: 'Nicolò Martì',
  },
  {
    label: 'multi-word particle Della',
    firstName: 'Giovanni',
    lastName: 'Della Rovere',
    expected: 'G.D.',
    displayName: 'Giovanni Della Rovere',
  },
  {
    label: 'non-Italian',
    firstName: 'Chen',
    lastName: 'Wei',
    expected: 'C.W.',
    displayName: 'Chen Wei',
  },
  {
    label: 'two given names (B4A stores full firstName)',
    firstName: 'Maria José',
    lastName: 'García',
    expected: 'M.G.',
    displayName: 'Maria José García', // remainder rule → M.J. — documented limitation
  },
];

describe('Banks4All initials (B4A mirror)', () => {
  it('buildHolderInitials matches B4A for every fixture pair', () => {
    for (const row of FIXTURES) {
      expect(buildHolderInitials(row.firstName, row.lastName), row.label).toBe(row.expected);
    }
  });

  it('displayName remainder rule matches B4A when given name is one token', () => {
    for (const row of FIXTURES) {
      if (row.firstName.includes(' ')) continue; // multi-word given names need split fields
      expect(initialsFromDisplayName(row.displayName), row.label).toBe(row.expected);
      expect(initialsMatch(row.expected, row.displayName), row.label).toBe(true);
    }
  });

  it('documents multi-word given-name limitation without separate fields', () => {
    // B4A: firstName="Maria José", lastName="García" → M.G.
    // EC displayName-only: first token + remainder → M.J.
    expect(buildHolderInitials('Maria José', 'García')).toBe('M.G.');
    expect(initialsFromDisplayName('Maria José García')).toBe('M.J.');
    expect(initialsMatch('M.G.', 'Maria José García')).toBe(false);
  });

  it('comparison is case- and diacritic-insensitive', () => {
    expect(normalizeInitials('n.m.')).toBe('NM');
    expect(initialsMatch('N.M.', 'nicolò martì')).toBe(true);
    expect(initialsMatch('M.A.', 'muba aziz')).toBe(true);
  });

  it('rejects last-token particle rule (De Luca must be D not L)', () => {
    expect(initialsFromDisplayName('Marco De Luca')).toBe('M.D.');
    expect(initialsFromDisplayName('Marco De Luca')).not.toBe('M.L.');
  });
});
