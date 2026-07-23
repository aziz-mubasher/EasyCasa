import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AuthUser } from '../../src/auth/auth.types';
import { DRIZZLE } from '../../src/db/db.module';
import type { Db } from '../../src/db/drizzle';
import { users } from '../../src/db/schema';
import { UsersService } from '../../src/users/users.service';
import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';

/**
 * K EC 1.13 regression — JWTs without an email claim must map to ONE internal user
 * via the stable `oidc:{sub}` slug, not create duplicate rows per request.
 */
const gate = dockerAvailable() ? describe : describe.skip;

gate('UsersService.getOrCreate (integration)', () => {
  let ctx: IntegrationContext;
  let db: Db;
  let usersService: UsersService;

  const sub = '11111111-2222-4333-8444-555555555555';
  const principal: AuthUser = {
    sub,
    name: 'No Email Seeker',
    roles: ['buyer'],
  };

  beforeAll(async () => {
    ctx = await startIntegration();
    db = ctx.app.get<Db>(DRIZZLE);
    usersService = ctx.app.get(UsersService);
  }, 300_000);

  afterAll(async () => {
    await ctx?.stop();
  });

  it('resolves to one user row when email is absent (oidc:{sub} fallback)', async () => {
    const first = await usersService.getOrCreate(principal);
    const second = await usersService.getOrCreate(principal);

    expect(first.id).toBe(second.id);
    expect(first.slug).toBe(`oidc:${sub}`);
    expect(first.email).toBeNull();

    const rows = await db.select().from(users).where(eq(users.slug, `oidc:${sub}`));
    expect(rows).toHaveLength(1);
  });

  it('still prefers email match when email is present', async () => {
    const email = 'realm-scope-test@example.it';
    const withEmail: AuthUser = { ...principal, sub: 'email-match-sub', email };

    const created = await usersService.getOrCreate(withEmail);
    const again = await usersService.getOrCreate({ ...withEmail, sub: 'different-sub-same-email' });

    expect(again.id).toBe(created.id);
    expect(created.email).toBe(email);
  });
});
