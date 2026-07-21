import { INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { HealthIndicatorRegistry } from '../../src/health/health-indicator.registry';
import { ReadinessController } from '../../src/health/readiness.controller';
import { runSeekerSmoke } from '../../src/pilot/smoke/pilot-smoke';
import { ReferenceAppModule, resetStore } from './reference-app';

describe('pilot smoke runner (real HTTP)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    resetStore();
    const registry = new HealthIndicatorRegistry();
    registry.register({
      name: 'postgres',
      async check() {
        return { name: 'postgres', up: true };
      },
    });

    @Module({
      imports: [ReferenceAppModule],
      controllers: [ReadinessController],
      providers: [{ provide: HealthIndicatorRegistry, useValue: registry }],
    })
    class SmokeAppModule {}

    app = await NestFactory.create(SmokeAppModule, { logger: false });
    await app.listen(0);
    const url = await app.getUrl();
    baseUrl = url.replace('[::1]', '127.0.0.1');
  }, 90_000);

  afterAll(async () => {
    await app?.close();
  });

  it('runs the full seeker journey green against a live server', async () => {
    const report = await runSeekerSmoke({ baseUrl, target: 'contract' });
    const failed = report.steps.filter((s) => !s.ok);
    expect(failed, JSON.stringify(failed)).toHaveLength(0);
    expect(report.ok).toBe(true);
    expect(report.steps.map((s) => s.name)).toEqual([
      'readiness',
      'search',
      'listing detail',
      'enquiry',
      'viewing',
    ]);
  });

  it('fails fast (short-circuits) against an unreachable base', async () => {
    const report = await runSeekerSmoke({
      baseUrl: 'http://127.0.0.1:1',
      target: 'contract',
    });
    expect(report.ok).toBe(false);
    expect(report.steps[0].name).toBe('readiness');
    expect(report.steps[0].ok).toBe(false);
    expect(report.steps).toHaveLength(1);
  });
});
