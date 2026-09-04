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
import { dockerAvailable, ensurePostgresImage } from './harness';
import { asUser } from './test-auth';

const gate = dockerAvailable() ? describe : describe.skip;

function dim1536(seed: number): number[] {
  return Array.from({ length: 1536 }, (_, i) => ((seed + i) % 97) / 97);
}

gate('Aste chat (integration EC-25)', () => {
  let app: INestApplication;
  let pg: StartedPostgreSqlContainer;
  let minio: StartedTestContainer;
  let meili: StartedTestContainer;
  let aiServer: Server;
  let translateCalls = 0;
  let stop: (() => Promise<void>) | undefined;

  const owner = asUser({
    sub: 'aste-chat-owner',
    email: 'aste-chat@example.it',
    name: 'Chat Owner',
    roles: ['buyer'],
  });
  const other = asUser({
    sub: 'aste-chat-other',
    email: 'aste-chat-other@example.it',
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
        const raw = Buffer.concat(chunks).toString('utf8');
        if (req.url === '/aste/translate') {
          translateCalls += 1;
          const body = JSON.parse(raw) as { texts: string[]; target_lang: string };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              translations: body.texts.map((t) =>
                body.target_lang === 'it' ? `IT:${t}` : `EN:${t}`,
              ),
            }),
          );
          return;
        }
        if (req.url === '/aste/embed') {
          const body = JSON.parse(raw) as { texts: string[] };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              embeddings: body.texts.map((_, i) => dim1536(i + 3)),
              dim: 1536,
            }),
          );
          return;
        }
        if (req.url === '/aste/chat') {
          const body = JSON.parse(raw) as {
            question: string;
            answer_lang: string;
            chunks: Array<{ document_id: string; page: number; text: string }>;
          };
          const q = body.question.toLowerCase();
          if (/should i buy|devo comprare/.test(q)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                answer: 'Refusal text',
                citations: [],
                refused: true,
              }),
            );
            return;
          }
          const first = body.chunks[0];
          if (!first || /visit|visitare/.test(q)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                answer:
                  body.answer_lang === 'en'
                    ? 'Not stated in the documents.'
                    : 'Non risulta nei documenti.',
                citations: [],
                refused: false,
              }),
            );
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              answer:
                body.answer_lang === 'en'
                  ? `Base price is 200000 ("prezzo base").`
                  : `Il prezzo base è 200000.`,
              citations: first
                ? [{ document_id: first.document_id, page: first.page }]
                : [],
              refused: false,
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
    process.env.AI_URL = `http://127.0.0.1:${aiPort}`;
    process.env.AI_INTERNAL_TOKEN = 'int-aste-token';
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

  async function seedReadyWithChunks() {
    const created = await request(api()).post('/aste/analyses').set(owner).send({
      language: 'it',
      register: 'first_buyer',
    });
    const analysisId = created.body.id as string;
    const { db } = await import('../../src/db/drizzle');
    const { asteAnalyses, asteDocuments } = await import('../../src/db/schema');
    const { eq, sql } = await import('drizzle-orm');

    const rows = await db.select().from(asteAnalyses).where(eq(asteAnalyses.id, analysisId)).limit(1);
    const userId = rows[0]!.userId;
    const periziaId = randomUUID();
    const avvisoId = randomUUID();

    await db.insert(asteDocuments).values([
      {
        id: periziaId,
        analysisId,
        minioKey: `users/${userId}/aste/${analysisId}/${periziaId}/p.pdf`,
        originalFilename: 'perizia.pdf',
        docType: 'perizia',
        mime: 'application/pdf',
        sizeBytes: 10,
        pageCount: 2,
        ocrStatus: 'done',
      },
      {
        id: avvisoId,
        analysisId,
        minioKey: `users/${userId}/aste/${analysisId}/${avvisoId}/a.pdf`,
        originalFilename: 'avviso.pdf',
        docType: 'avviso',
        mime: 'application/pdf',
        sizeBytes: 10,
        pageCount: 1,
        ocrStatus: 'done',
      },
    ]);

    const extraction = fixtureReadyExtraction({ perizia: periziaId, avviso: avvisoId });
    await db
      .update(asteAnalyses)
      .set({
        status: 'ready',
        extraction,
        semaforo: computeSemaforo(extraction),
        updatedAt: new Date(),
      })
      .where(eq(asteAnalyses.id, analysisId));

    const emb = dim1536(7);
    const vectorLiteral = `[${emb.join(',')}]`;
    await db.execute(sql`
      INSERT INTO aste_doc_chunks (document_id, page, chunk_index, text, embedding)
      VALUES
        (${periziaId}::uuid, 2, 0, ${'Valore di stima 250000. Immobile libero da persone.'}, ${vectorLiteral}::vector),
        (${avvisoId}::uuid, 1, 0, ${'Prezzo base 200000. Offerta minima 150000. Modalita telematica.'}, ${vectorLiteral}::vector)
    `);

    return { analysisId, periziaId, avvisoId };
  }

  it('grounds answers with citations; EN translates query; refuse advice; owner-only', async () => {
    const { analysisId, avvisoId } = await seedReadyWithChunks();
    translateCalls = 0;

    const itAsk = await request(api())
      .post(`/aste/analyses/${analysisId}/chat`)
      .set(owner)
      .send({ question: 'Qual è il prezzo base?', lang: 'it' });
    expect([200, 201]).toContain(itAsk.status);
    expect(itAsk.body.assistantMessage.citations.length).toBeGreaterThanOrEqual(1);
    expect(itAsk.body.assistantMessage.citations[0].document_id).toBe(avvisoId);
    expect(itAsk.body.filenameById[avvisoId]).toBe('avviso.pdf');
    expect(translateCalls).toBe(0);

    const hist = await request(api()).get(`/aste/analyses/${analysisId}/chat`).set(owner);
    expect(hist.status).toBe(200);
    expect(hist.body.messages.length).toBeGreaterThanOrEqual(2);

    const enAsk = await request(api())
      .post(`/aste/analyses/${analysisId}/chat`)
      .set(owner)
      .send({ question: 'What is the base price?', lang: 'en' });
    expect([200, 201]).toContain(enAsk.status);
    expect(translateCalls).toBe(1);

    const missing = await request(api())
      .post(`/aste/analyses/${analysisId}/chat`)
      .set(owner)
      .send({ question: 'Can I visit the property tomorrow?', lang: 'en' });
    expect([200, 201]).toContain(missing.status);
    expect(missing.body.assistantMessage.citations).toEqual([]);
    expect(missing.body.assistantMessage.refused).toBe(false);

    const refused = await request(api())
      .post(`/aste/analyses/${analysisId}/chat`)
      .set(owner)
      .send({ question: 'Should I buy this?', lang: 'en' });
    expect([200, 201]).toContain(refused.status);
    expect(refused.body.assistantMessage.refused).toBe(true);

    const foreign = await request(api())
      .post(`/aste/analyses/${analysisId}/chat`)
      .set(other)
      .send({ question: 'Ciao', lang: 'it' });
    expect([403, 404]).toContain(foreign.status);
  });
});
