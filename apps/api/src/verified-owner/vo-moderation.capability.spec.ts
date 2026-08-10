import { describe, expect, it } from 'vitest';

import { capabilitiesFromRoles } from '@easycasa/shared';

describe('vo_moderation capability (EC-S-T15)', () => {
  it('is granted to admin_operations and admin_superadmin, not aml', () => {
    expect(capabilitiesFromRoles(['admin_operations'])).toContain('vo_moderation');
    expect(capabilitiesFromRoles(['admin_superadmin'])).toContain('vo_moderation');
    expect(capabilitiesFromRoles(['admin_aml'])).not.toContain('vo_moderation');
    expect(capabilitiesFromRoles(['admin_support'])).not.toContain('vo_moderation');
    expect(capabilitiesFromRoles(['admin'])).not.toContain('vo_moderation');
  });
});
