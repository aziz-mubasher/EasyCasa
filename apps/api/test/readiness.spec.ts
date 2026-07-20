import { INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { ReadinessController } from '../src/health/readiness.controller';
import { HealthIndicatorRegistry } from '../src/health/health-indicator.registry';
import type { HealthIndicator } from '../src/health/health-indicator';

const up: HealthIndicator = {
  name: 'postgres',
  async check() {
    return { name: 'postgres', up: true };
  },
};
const down: HealthIndicator = {
  name: 'meili',
  async check() {
    return { name: 'meili', up: false, detail: 'timeout' };
  },
};

async function appWith(indicators: HealthIndicator[]): Promise<INestApplication> {
  const registry = new HealthIndicatorRegistry();
  for (const i of indicators) registry.register(i);

  @Module({
    controllers: [ReadinessController],
    providers: [{ provide: HealthIndicatorRegistry, useValue: registry }],
  })
  class M {}
  const app = (await Test.createTestingModule({ imports: [M] }).compile()).createNestApplication();
  await app.init();
  return app;
}

describe('readiness', () => {
  const apps: INestApplication[] = [];
  afterAll(async () => {
    for (const a of apps) await a.close();
  }, 30_000);

  it(
    '/health/live is always ok',
    async () => {
      const app = await appWith([up]);
      apps.push(app);
      await request(app.getHttpServer()).get('/health/live').expect(200);
    },
    30_000,
  );
  it(
    '/health/ready 200 when all deps up',
    async () => {
      const app = await appWith([up]);
      apps.push(app);
      const res = await request(app.getHttpServer()).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
    },
    30_000,
  );
  it(
    '/health/ready 503 when any dep down',
    async () => {
      const app = await appWith([up, down]);
      apps.push(app);
      const res = await request(app.getHttpServer()).get('/health/ready');
      expect(res.status).toBe(503);
    },
    30_000,
  );
});
