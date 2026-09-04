import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createServer, type Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import request from 'supertest';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { computeSemaforo } from '../../src/aste/aste-semaforo';
import { fixtureReadyExtraction } from '../fixtures/aste/ready-extraction';
import { fixtureEx2NoPeriziaLotto7 } from '../../src/aste/stima-not-found.fixtures';
import { dockerAvailable, ensurePostgresImage, meiliWait } from './harness';
import { asUser } from './test-auth';

const gate = dockerAvailable() ? describe : describe.skip;

gate('Aste report (integration EC-24)', () => {
  let app: INestApplication;
  let pg: StartedPostgreSqlContainer;
  let minio: StartedTestContainer;
  let meili: StartedTestContainer;
  let aiServer: Server;
  let translateCalls = 0;
  let stop: (() => Promise<void>) | undefined;

  const owner = asUser({
    sub: 'aste-report-owner',
    email: 'aste-report@example.it',
    name: 'Report Owner',
    roles: ['buyer'],
  });
  const other = asUser({
    sub: 'aste-report-other',
    email: 'aste-report-other@example.it',
    name: 'Other',
    roles: ['buyer'],
  });

  beforeAll(async () => {
    translateCalls = 0;
    aiServer = createServer((req, res) => {
      if (req.headers['x-ec-internal'] !== 'int-aste-token') {
        res.writeHead(401);
        res.end('{}');
        return;
      }
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      req.on('end', () => {
        if (req.url === '/aste/translate') {
          translateCalls += 1;
          const raw = Buffer.concat(chunks).toString('utf8');
          const body = JSON.parse(raw) as { texts: string[] };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              translations: body.texts.map((t) => `EN:${t}`),
            }),
          );
          return;
        }
        res.writeHead(404);
        res.end('{}');
      });
    });
    await new Promise<void>((resolve) => aiServer.listen(0, '127.0.0.1', () => resolve()));
    const aiPort = (aiServer.address() as { port: number }).port;

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
      .withWaitStrategy(meiliWait())
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
    process.env.AI_URL = `http://127.0.0.1:${aiPort}`;
    process.env.AI_INTERNAL_TOKEN = 'int-aste-token';
    process.env.WA_HANDLE_SECRET = 'int-test-wa-handle-secret';
    process.env.WHATSAPP_APP_SECRET = 'int-test-wa-secret';

    const { resetConfigCache } = await import('../../src/config');
    resetConfigCache();
    const { resetDbConnection } = await import('../../src/db/drizzle');
    await resetDbConnection();
    const { resetMeiliClient } = await import('../../src/search/meili');
    resetMeiliClient();

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
      await new Promise<void>((resolve) => aiServer.close(() => resolve()));
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

  async function seedReadyAnalysis() {
    const created = await request(api()).post('/aste/analyses').set(owner).send({
      language: 'it',
      register: 'first_buyer',
    });
    expect([200, 201]).toContain(created.status);
    const analysisId = created.body.id as string;

    const { db } = await import('../../src/db/drizzle');
    const { asteAnalyses, asteDocuments, omiQuotes } = await import('../../src/db/schema');
    const { eq } = await import('drizzle-orm');

    const rows = await db.select().from(asteAnalyses).where(eq(asteAnalyses.id, analysisId)).limit(1);
    const userId = rows[0]!.userId;

    const periziaId = randomUUID();
    const avvisoId = randomUUID();
    await db.insert(asteDocuments).values([
      {
        id: periziaId,
        analysisId,
        minioKey: `users/${userId}/aste/${analysisId}/${periziaId}/perizia.pdf`,
        originalFilename: 'perizia-milano.pdf',
        docType: 'perizia',
        mime: 'application/pdf',
        sizeBytes: 100,
        pageCount: 8,
        ocrStatus: 'done',
      },
      {
        id: avvisoId,
        analysisId,
        minioKey: `users/${userId}/aste/${analysisId}/${avvisoId}/avviso.pdf`,
        originalFilename: 'avviso-vendita.pdf',
        docType: 'avviso',
        mime: 'application/pdf',
        sizeBytes: 80,
        pageCount: 3,
        ocrStatus: 'done',
      },
    ]);

    const extraction = fixtureReadyExtraction({ perizia: periziaId, avviso: avvisoId });
    const semaforo = computeSemaforo(extraction);

    await db.insert(omiQuotes).values({
      comune: 'MILANO',
      provincia: 'MI',
      type: 'apartment',
      minPerM2Cents: 250_000,
      maxPerM2Cents: 350_000,
      period: '2024_2',
      omiZone: 'B1',
      linkZona: 'MI-B1',
      codTip: 20,
      stato: 'NORMALE',
      geoLevel: 'comune',
      basis: 'zone_median',
      attribution: 'Fonte: OMI — Agenzia delle Entrate',
    });

    await db
      .update(asteAnalyses)
      .set({
        status: 'ready',
        extraction,
        semaforo,
        tribunale: 'Milano',
        rge: '123/2024',
        lotto: '1',
        comune: 'Milano',
        provincia: 'MI',
        addressRaw: 'Via Dante 1',
        updatedAt: new Date(),
      })
      .where(eq(asteAnalyses.id, analysisId));

    return { analysisId, periziaId, avvisoId };
  }

  async function seedNotFoundStimaAnalysis() {
    const created = await request(api()).post('/aste/analyses').set(owner).send({
      language: 'it',
      register: 'investor',
    });
    expect([200, 201]).toContain(created.status);
    const analysisId = created.body.id as string;

    const { db } = await import('../../src/db/drizzle');
    const { asteAnalyses, asteDocuments, omiQuotes } = await import('../../src/db/schema');
    const { eq } = await import('drizzle-orm');

    const rows = await db.select().from(asteAnalyses).where(eq(asteAnalyses.id, analysisId)).limit(1);
    const userId = rows[0]!.userId;

    const avvisoId = randomUUID();
    await db.insert(asteDocuments).values({
      id: avvisoId,
      analysisId,
      minioKey: `users/${userId}/aste/${analysisId}/${avvisoId}/avviso.pdf`,
      originalFilename: 'avviso-ex2-lotto7.pdf',
      docType: 'avviso',
      mime: 'application/pdf',
      sizeBytes: 80,
      pageCount: 6,
      ocrStatus: 'done',
    });

    const extraction = fixtureEx2NoPeriziaLotto7(avvisoId);
    const semaforo = computeSemaforo(extraction);

    await db.insert(omiQuotes).values({
      comune: 'NOCERA INFERIORE',
      provincia: 'SA',
      type: 'apartment',
      minPerM2Cents: 80_000,
      maxPerM2Cents: 120_000,
      period: '2024_2',
      omiZone: 'Z1',
      linkZona: 'SA-Z1',
      codTip: 20,
      stato: 'NORMALE',
      geoLevel: 'comune',
      basis: 'zone_median',
      attribution: 'Fonte: OMI — Agenzia delle Entrate',
    });

    await db
      .update(asteAnalyses)
      .set({
        status: 'ready',
        extraction,
        semaforo,
        tribunale: 'Nocera Inferiore',
        rge: '10/2023',
        lotto: '7',
        comune: 'Nocera Inferiore',
        provincia: 'SA',
        addressRaw: 'Via Example 10',
        updatedAt: new Date(),
      })
      .where(eq(asteAnalyses.id, analysisId));

    return { analysisId, avvisoId };
  }

  it('IT report zero translate; EN translate once then cache; citations use filename; buyer profile', async () => {
    const { analysisId } = await seedReadyAnalysis();
    translateCalls = 0;

    const it1 = await request(api()).get(`/aste/analyses/${analysisId}/report?lang=it`).set(owner);
    expect(it1.status).toBe(200);
    expect(it1.body.reportContentLang).toBe('it');
    expect(translateCalls).toBe(0);
    expect(it1.body.extraction.economics.prezzo_base.source.file).toBeTruthy();
    const prezzoFile = it1.body.extraction.economics.prezzo_base.source.file as string;
    expect(it1.body.filenameById[prezzoFile]).toBe('avviso-vendita.pdf');
    expect(it1.body.omiCheck).toBeTruthy();
    expect(it1.body.omiCheck.available).toBe(true);
    expect(['comune', 'zone']).toContain(it1.body.omiCheck.method);
    expect(it1.body.buyerReadiness.level).toBe('unknown');

    const en1 = await request(api()).get(`/aste/analyses/${analysisId}/report?lang=en`).set(owner);
    expect(en1.status).toBe(200);
    expect(en1.body.reportContentLang).toBe('en');
    expect(translateCalls).toBe(1);
    expect(Object.keys(en1.body.translations).length).toBeGreaterThan(0);

    const en2 = await request(api()).get(`/aste/analyses/${analysisId}/report?lang=en`).set(owner);
    expect(en2.status).toBe(200);
    expect(translateCalls).toBe(1);

    const es = await request(api()).get(`/aste/analyses/${analysisId}/report?lang=es`).set(owner);
    expect(es.status).toBe(200);
    expect(es.body.esContentFallback).toBe(true);
    expect(es.body.reportContentLang).toBe('it');

    const patch = await request(api())
      .patch(`/aste/analyses/${analysisId}`)
      .set(owner)
      .send({
        residency: 'non_eu',
        purpose: 'investimento',
        has_cf: false,
        has_pec_firma: true,
        financing_needed: false,
      });
    expect([200, 201]).toContain(patch.status);
    expect(patch.body.buyerReadiness.level).toBe('verify');
    expect(patch.body.semaforo.buyer_readiness).toBe('verify');

    const after = await request(api()).get(`/aste/analyses/${analysisId}/report?lang=it`).set(owner);
    expect(after.body.semaforo.buyer_readiness).toBe('verify');
    expect(after.body.buyerReadiness.checklist.some((c: { key: string }) => c.key === 'cf_required_non_eu')).toBe(
      true,
    );

    const foreign = await request(api()).get(`/aste/analyses/${analysisId}/report`).set(other);
    expect([403, 404]).toContain(foreign.status);
  });

  it('EC-24-VERIFY: valore_stima not_found — OMI band + null stima pct; no throw', async () => {
    const { analysisId } = await seedNotFoundStimaAnalysis();

    const res = await request(api()).get(`/aste/analyses/${analysisId}/report?lang=it`).set(owner);
    expect(res.status).toBe(200);
    expect(res.body.extraction.economics.valore_stima).toBeNull();
    expect(res.body.extraction.meta.not_found).toContain('economics.valore_stima');
    expect(res.body.extraction.economics.cauzione.derived).toBe(true);

    const omi = res.body.omiCheck;
    expect(omi.available).toBe(true);
    expect(omi.omi_range).toBeTruthy();
    expect(omi.valore_stima_vs_omi_pct).toBeNull();
    expect(omi.sconto_reale_pct == null || Number.isFinite(omi.sconto_reale_pct)).toBe(true);
    if (omi.sconto_reale_pct != null) {
      expect(Number.isFinite(omi.sconto_reale_pct)).toBe(true);
    }
  });
});
