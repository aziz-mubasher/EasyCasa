import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('EC-13 admin_audit_log migration', () => {
  it('revokes UPDATE and DELETE from application role', () => {
    const sql = readFileSync(
      join(__dirname, '../../../../migration/sql/0037_admin_portal.sql'),
      'utf8',
    );
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS admin_audit_log/);
    expect(sql).toMatch(/REVOKE UPDATE,\s*DELETE ON admin_audit_log FROM easycasa/);
    expect(sql).toMatch(/REVOKE UPDATE,\s*DELETE ON authority_audit_log FROM easycasa/);
  });
});
