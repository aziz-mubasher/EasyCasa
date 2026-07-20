import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { SignJWT, exportJWK, generateKeyPair, createLocalJWKSet } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { JWKS_RESOLVER, type JwksResolver } from './jwks.provider';
import { JwtAuthGuard } from './jwt.guard';
import { JwtVerifier } from './jwt-verifier';
import { RolesGuard } from './roles.guard';

const ISSUER = 'https://kc.easycasa.test/realms/easycasa';
const AUDIENCE = 'easycasa-api';
const KID = 'e2e-key';

@Controller()
class Routes {
  @Public()
  @Get('public')
  open() {
    return { ok: true };
  }

  @Get('me')
  me() {
    return { ok: true };
  }

  @Roles('admin')
  @Get('admin')
  adminOnly() {
    return { ok: true };
  }
}

async function build(devAuth: boolean, resolver: JwksResolver): Promise<INestApplication> {
  const config = {
    OIDC_ISSUER: ISSUER,
    OIDC_AUDIENCE: AUDIENCE,
    OIDC_ROLES_CLAIM: 'realm_access.roles',
    OIDC_JWKS_URL: 'https://kc.easycasa.test/jwks',
    DEV_AUTH: devAuth,
  } as ApiConfig;

  @Module({
    controllers: [Routes],
    providers: [
      { provide: APP_CONFIG, useValue: config },
      { provide: JWKS_RESOLVER, useValue: resolver },
      JwtVerifier,
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
    ],
  })
  class TestAppModule {}

  const moduleRef = await Test.createTestingModule({ imports: [TestAppModule] }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('Auth pipeline (e2e via supertest)', () => {
  let sign: (claims: Record<string, unknown>) => Promise<string>;
  let resolver: JwksResolver;
  let prodApp: INestApplication;
  let devApp: INestApplication;

  beforeAll(async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const pub = await exportJWK(publicKey);
    pub.kid = KID;
    pub.alg = 'RS256';
    resolver = createLocalJWKSet({ keys: [pub] }) as unknown as JwksResolver;
    sign = (claims) =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid: KID })
        .setIssuedAt()
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime('5m')
        .sign(privateKey);

    prodApp = await build(false, resolver);
    devApp = await build(true, resolver);
  }, 60_000);

  afterAll(async () => {
    await prodApp?.close();
    await devApp?.close();
  });

  it('public route needs no auth', async () => {
    await request(prodApp.getHttpServer()).get('/public').expect(200);
  });

  it('authed route 401s without a bearer token', async () => {
    await request(prodApp.getHttpServer()).get('/me').expect(401);
  });

  it('authed route 200s with a valid token', async () => {
    const token = await sign({ sub: 'u1', realm_access: { roles: ['buyer'] } });
    await request(prodApp.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('role route 403s for a non-admin', async () => {
    const token = await sign({ sub: 'u1', realm_access: { roles: ['buyer'] } });
    await request(prodApp.getHttpServer())
      .get('/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('role route 200s for admin (superuser)', async () => {
    const token = await sign({ sub: 'a1', realm_access: { roles: ['admin'] } });
    await request(prodApp.getHttpServer())
      .get('/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('DEV_AUTH trusts x-dev-* headers (pre-cutover path)', async () => {
    await request(devApp.getHttpServer()).get('/me').set('x-dev-user', 'dev-1').expect(200);
    await request(devApp.getHttpServer()).get('/me').expect(401);
  });
});
