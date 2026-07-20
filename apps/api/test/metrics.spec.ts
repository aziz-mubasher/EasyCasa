import { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Controller, Get, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MetricsController } from '../src/observability/metrics.controller';
import { MetricsInterceptor } from '../src/observability/metrics.interceptor';

@Controller('ping')
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

@Module({
  controllers: [PingController, MetricsController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: MetricsInterceptor }],
})
class M {}

describe('/metrics', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = (await Test.createTestingModule({ imports: [M] }).compile()).createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });

  it('exposes Prometheus text format with default + http metrics', async () => {
    await request(app.getHttpServer()).get('/ping').expect(200);
    const res = await request(app.getHttpServer()).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('process_cpu_user_seconds_total');
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('app="easycasa-api"');
  });
});
