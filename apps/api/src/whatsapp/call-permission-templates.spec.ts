import { describe, expect, it } from 'vitest';

import {
  CALL_PERMISSION_BODIES,
  callPermissionCatalog,
  callPermissionCreatePayload,
  callPermissionTemplate,
} from './call-permission-templates';

describe('Easy Casa call permission templates', () => {
  it('covers the languages already approved on the Easy Casa number', () => {
    expect(Object.keys(CALL_PERMISSION_BODIES)).toEqual([
      'it', 'en', 'es', 'fr', 'ro', 'ru', 'uk', 'ur', 'hi', 'pa', 'bn', 'ar',
    ]);
  });

  it('is the approved utility template with the permission card and no body variables', () => {
    const payload = callPermissionCreatePayload('it');
    expect(payload?.name).toBe('ec_callback_permission');
    expect(payload?.language).toBe('it');
    expect(payload?.category).toBe('UTILITY');
    expect(payload?.components.map((item) => item.type)).toEqual([
      'BODY',
      'CALL_PERMISSION_REQUEST',
    ]);
    const body = String(payload?.components[0]?.text);
    expect(body).not.toMatch(/\{\{/);
    expect(body).not.toContain('Banks4All');
    expect(body).toContain('Easy Casa Italia');
  });

  it('refuses a language WhatsApp cannot store', () => {
    expect(callPermissionTemplate('pnb')).toBeNull();
    expect(callPermissionCatalog()).toHaveLength(12);
  });
});
