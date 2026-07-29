import { describe, expect, it } from 'vitest';
import {
  adminRolesFromRoles,
  capabilitiesFromRoles,
} from '@easycasa/shared';

describe('capabilitiesFromRoles (EC-11)', () => {
  it('grants seeker to every principal', () => {
    expect(capabilitiesFromRoles([])).toContain('seeker');
    expect(capabilitiesFromRoles(['buyer'])).toEqual(['seeker']);
  });

  it('maps seller → owner + conductor', () => {
    const caps = capabilitiesFromRoles(['seller']);
    expect(caps).toEqual(expect.arrayContaining(['seeker', 'owner', 'conductor']));
  });

  it('maps agent → agency_member + conductor + owner', () => {
    const caps = capabilitiesFromRoles(['agent']);
    expect(caps).toEqual(
      expect.arrayContaining(['agency_member', 'conductor', 'owner', 'seeker']),
    );
  });

  it('maps professional', () => {
    expect(capabilitiesFromRoles(['professional'])).toEqual(
      expect.arrayContaining(['professional', 'conductor', 'seeker']),
    );
  });

  it('maps admin → admin capability', () => {
    expect(capabilitiesFromRoles(['admin'])).toContain('admin');
  });
});

describe('adminRolesFromRoles (EC-11)', () => {
  it('legacy admin becomes superadmin', () => {
    expect(adminRolesFromRoles(['admin'])).toContain('superadmin');
  });

  it('maps admin_operations', () => {
    expect(adminRolesFromRoles(['admin_operations'])).toContain('operations');
  });
});
