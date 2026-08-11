/** EC-S-T28/T29 — partner directory helpers + T29 no-bypass upload contract. */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertNoReferralTracking,
  capabilitiesFromRoles,
  sanitizePartnerContact,
} from '@easycasa/shared';

import { PartnerDirectoryEnabledGuard } from './partner-directory.guard';
import type { ApiConfig } from '../config/load';

describe('partner directory privacy', () => {
  it('strips tracking / referral query params from contact URLs', () => {
    expect(
      sanitizePartnerContact('https://studio.example/it?utm_source=ec&ref=paid'),
    ).toBe('https://studio.example/it');
    expect(assertNoReferralTracking('https://studio.example/it?utm_campaign=x')).toBe(
      false,
    );
    expect(assertNoReferralTracking('https://studio.example/it')).toBe(true);
  });
});

describe('partner_directory capability', () => {
  it('grants to operations + superadmin', () => {
    expect(capabilitiesFromRoles(['admin_operations'])).toContain('partner_directory');
    expect(capabilitiesFromRoles(['admin_superadmin'])).toContain('partner_directory');
    expect(capabilitiesFromRoles(['admin_aml'])).not.toContain('partner_directory');
  });
});

describe('PartnerDirectoryEnabledGuard', () => {
  it('404 when flag off', () => {
    const guard = new PartnerDirectoryEnabledGuard({
      PARTNER_DIRECTORY_ENABLED: false,
    } as ApiConfig);
    expect(() => guard.canActivate()).toThrow(/not available/);
  });
});

describe('T29 — no pro bypass upload endpoint', () => {
  it('media controllers do not expose a pro-only upload route', () => {
    const mediaDir = join(__dirname, '../media');
    const files = readdirSync(mediaDir).filter((f) => f.endsWith('.ts'));
    const blob = files.map((f) => readFileSync(join(mediaDir, f), 'utf8')).join('\n');
    expect(blob).not.toMatch(/pro[-_]?upload|bypass.*hash|skip.*exif/i);
    expect(blob).not.toMatch(/@Controller\(['"]pro\/media/);
  });
});
