import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { UsersService } from '../users/users.service';
import { ConsentService, CONSENT_STORE, type ConsentRecord, type ConsentStore } from './consent.service';
import { DataSubjectController } from './data-subject.controller';
import { DsarService } from './dsar.service';
import { ErasureService } from './erasure.service';
import type { PersonalDataSource } from './personal-data-source';

@Injectable()
class StubAuth implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { sub: string; email?: string };
    }>();
    const sub = req.headers['x-test-user'];
    if (sub) req.user = { sub, email: `${sub}@example.it` };
    return true;
  }
}

const src: PersonalDataSource = {
  source: 'enquiries',
  async collect(id) {
    return { source: 'enquiries', records: id === 'user-anna' ? [{ id: 'e1' }] : [] };
  },
  async erase() {
    return { source: 'enquiries', erased: 1, retainedUnderLegalHold: 0 };
  },
};

class MemConsent implements ConsentStore {
  rows: ConsentRecord[] = [];
  async append(r: ConsentRecord) {
    this.rows.push(r);
  }
  async latest(s: string, p: ConsentRecord['purpose']) {
    const m = this.rows.filter((r) => r.subjectId === s && r.purpose === p);
    return m.at(-1) ?? null;
  }
  async listForSubject(s: string) {
    return this.rows.filter((r) => r.subjectId === s);
  }
}

describe('DataSubjectController (e2e)', () => {
  let app: INestApplication;
  const store = new MemConsent();

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [DataSubjectController],
      providers: [
        { provide: CONSENT_STORE, useValue: store },
        ConsentService,
        { provide: DsarService, useValue: new DsarService([src]) },
        { provide: ErasureService, useValue: new ErasureService([src]) },
        {
          provide: UsersService,
          useValue: {
            async getOrCreate(user: { sub: string }) {
              return { id: `user-${user.sub}`, email: `${user.sub}@example.it` };
            },
          },
        },
        { provide: APP_GUARD, useClass: StubAuth },
      ],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /me/privacy/export returns the subject bundle', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/me/privacy/export')
      .set('x-test-user', 'anna');
    expect(res.status).toBe(200);
    expect(res.body.subjectId).toBe('user-anna');
    expect(res.body.sections[0].records).toHaveLength(1);
  });

  it('POST /me/privacy/consents records consent', async () => {
    await request(app.getHttpServer())
      .post('/api/me/privacy/consents')
      .set('x-test-user', 'anna')
      .send({ purpose: 'privacy_policy', granted: true, policyVersion: 'v1' })
      .expect(201);
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({
      subjectId: 'user-anna',
      purpose: 'privacy_policy',
      granted: true,
    });
  });

  it('POST /me/privacy/erase returns an erasure report', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/me/privacy/erase')
      .set('x-test-user', 'anna');
    expect([200, 201]).toContain(res.status);
    expect(res.body.outcomes[0].erased).toBe(1);
    expect(res.body.fullyErased).toBe(true);
  });
});
