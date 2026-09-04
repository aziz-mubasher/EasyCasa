import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import request from 'supertest';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { dockerAvailable, ensurePostgresImage } from './harness';
import { asUser } from './test-auth';

/**
 * EC-22 — own Postgres + MinIO + Meili so ASTE_ANALYSIS_ENABLED and S3 are set
 * before AppModule boots (shared harness may already be up without them).
 * Flag-off → 404 is covered by AsteAnalysisEnabledGuard unit tests.
 */
const gate = dockerAvailable() ? describe : describe.skip;

gate('Aste analysis upload flow (integration)', () => {
  let app: INestApplication;
  let pg: StartedPostgreSqlContainer;
  let minio: StartedTestContainer;
  let meili: StartedTestContainer;
  let stop: (() => Promise<void>) | undefined;

  const owner = asUser({
    sub: 'aste-owner',
    email: 'aste-owner@example.it',
    name: 'Aste Owner',
    roles: ['buyer'],
  });
  const other = asUser({
    sub: 'aste-other',
    email: 'aste-other@example.it',
    name: 'Aste Other',
    roles: ['buyer'],
  });

  beforeAll(async () => {
    ensurePostgresImage();

    pg = await new PostgreSqlContainer('easycasa-postgres-int')
      .withDatabase('easycasa_test')
      .withUsername('easycasa')
      .withPassword('easycasa')
      .start();

    minio = await new GenericContainer('minio/minio:RELEASE.2024-12-18T13-15-44Z')
      .withEnvironment({
        MINIO_ROOT_USER: 'easycasa',
        MINIO_ROOT_PASSWORD: 'change_me_minio',
      })
      .withExposedPorts(9000)
      .withCommand(['server', '/data'])
      .withWaitStrategy(Wait.forLogMessage(/API:.*/))
      .start();

    meili = await new GenericContainer('getmeili/meilisearch:v1.10')
      .withEnvironment({ MEILI_MASTER_KEY: 'test', MEILI_ENV: 'development' })
      .withExposedPorts(7700)
      .withWaitStrategy(Wait.forHttp('/health', 7700))
      .start();

    const minioEndpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`;
    const s3 = new S3Client({
      endpoint: minioEndpoint,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: { accessKeyId: 'easycasa', secretAccessKey: 'change_me_minio' },
    });
    try {
      await s3.send(new HeadBucketCommand({ Bucket: 'easycasa-media' }));
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: 'easycasa-media' }));
    }

    process.env.NODE_ENV = 'test';
    process.env.ALLOW_PROVIDER_STUBS = 'true';
    process.env.EC_TEST_AUTH = 'true';
    process.env.DATABASE_URL = pg.getConnectionUri();
    process.env.MEILI_URL = `http://${meili.getHost()}:${meili.getMappedPort(7700)}`;
    process.env.MEILI_MASTER_KEY = 'test';
    process.env.S3_ENDPOINT = minioEndpoint;
    process.env.MINIO_ROOT_USER = 'easycasa';
    process.env.MINIO_ROOT_PASSWORD = 'change_me_minio';
    process.env.MINIO_BUCKET = 'easycasa-media';
    process.env.ASTE_ANALYSIS_ENABLED = 'true';
    process.env.WA_HANDLE_SECRET = 'int-test-wa-handle-secret';
    process.env.WHATSAPP_APP_SECRET = 'int-test-wa-secret';

    const { resetConfigCache } = await import('../../src/config');
    resetConfigCache();
    const { resetDbConnection } = await import('../../src/db/drizzle');
    await resetDbConnection();

    execFileSync('pnpm', ['--filter', '@easycasa/migration', 'migrate'], {
      stdio: 'inherit',
      cwd: path.resolve(process.cwd(), '../..'),
      env: { ...process.env },
    });

    const { AppModule } = await import('../../src/app.module');
    const { JwtAuthGuard } = await import('../../src/auth/jwt.guard');
    const { TestAuthGuard } = await import('./test-auth');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(JwtAuthGuard)
      .useClass(TestAuthGuard)
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    stop = async () => {
      await app.close().catch(() => undefined);
      await resetDbConnection();
      await meili.stop().catch(() => undefined);
      await minio.stop().catch(() => undefined);
      await pg.stop().catch(() => undefined);
    };
  }, 600_000);

  afterAll(async () => {
    await stop?.();
  });

  const api = () => app.getHttpServer();

  it('create → upload pdf+jpg → submit; rejects bad mime; owner-only; delete', async () => {
    const created = await request(api()).post('/aste/analyses').set(owner).send({
      language: 'it',
      register: 'first_buyer',
    });
    expect([200, 201]).toContain(created.status);
    const id = created.body.id as string;
    expect(created.body.status).toBe('draft');

    const pdf = await request(api())
      .post(`/aste/analyses/${id}/documents`)
      .set(owner)
      .field('docType', 'perizia')
      .attach('file', Buffer.from('%PDF-1.4 test'), {
        filename: 'perizia.pdf',
        contentType: 'application/pdf',
      });
    expect([200, 201]).toContain(pdf.status);
    expect(pdf.body.docType).toBe('perizia');

    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
    ]);
    const img = await request(api())
      .post(`/aste/analyses/${id}/documents`)
      .set(owner)
      .field('docType', 'planimetria')
      .attach('file', jpeg, { filename: 'plan.jpg', contentType: 'image/jpeg' });
    expect([200, 201]).toContain(img.status);

    const badMime = await request(api())
      .post(`/aste/analyses/${id}/documents`)
      .set(owner)
      .field('docType', 'altro')
      .attach('file', Buffer.from('hello'), {
        filename: 'x.txt',
        contentType: 'text/plain',
      });
    expect(badMime.status).toBeGreaterThanOrEqual(400);

    const submitted = await request(api()).post(`/aste/analyses/${id}/submit`).set(owner);
    expect([200, 201]).toContain(submitted.status);
    expect(submitted.body.status).toBe('uploaded');

    const detail = await request(api()).get(`/aste/analyses/${id}`).set(owner);
    expect(detail.status).toBe(200);
    expect(detail.body.documents).toHaveLength(2);

    const foreign = await request(api()).get(`/aste/analyses/${id}`).set(other);
    expect([403, 404]).toContain(foreign.status);

    const del = await request(api()).delete(`/aste/analyses/${id}`).set(owner);
    expect([200, 201]).toContain(del.status);
    const gone = await request(api()).get(`/aste/analyses/${id}`).set(owner);
    expect(gone.status).toBe(404);
  });
});
