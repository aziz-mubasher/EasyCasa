import { BadRequestException, Controller, Get, INestApplication, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AllExceptionsFilter } from '../src/observability/all-exceptions.filter';
import { ERROR_REPORTER, type ErrorReporter } from '../src/observability/error-reporter';

const captured: unknown[] = [];
const reporter: ErrorReporter = {
  capture(e) {
    captured.push(e);
  },
};

@Controller('x')
class XController {
  @Get('client')
  client() {
    throw new BadRequestException('bad input');
  }
  @Get('server')
  server() {
    throw new Error('kaboom');
  }
}

@Module({
  controllers: [XController],
  providers: [
    { provide: ERROR_REPORTER, useValue: reporter },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
class M {}

describe('AllExceptionsFilter', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = (await Test.createTestingModule({ imports: [M] }).compile()).createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });

  it('4xx: consistent envelope, NOT reported', async () => {
    captured.length = 0;
    const res = await request(app.getHttpServer()).get('/x/client');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ statusCode: 400 });
    expect(res.body.timestamp).toBeTruthy();
    expect(captured).toHaveLength(0);
  });
  it('5xx: envelope hides internals AND is reported', async () => {
    captured.length = 0;
    const res = await request(app.getHttpServer()).get('/x/server');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('kaboom');
    expect(captured).toHaveLength(1);
  });
});
