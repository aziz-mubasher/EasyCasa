import { type INestApplication } from '@nestjs/common';
import { createServer, type Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AstePipelineService } from '../../src/aste/aste-pipeline.service';
import {
  FIXTURE_MISSING_ECONOMICS,
  FIXTURE_NATIVE_AVVISO,
  FIXTURE_NATIVE_PERIZIA,
  TINY_PNG,
} from '../fixtures/aste/synthetic';
import { dockerAvailable, startIntegration } from './harness';
import { asUser } from './test-auth';

const gate = dockerAvailable() ? describe : describe.skip;

function dim1536(seed: number): number[] {
  return Array.from({ length: 1536 }, (_, i) => ((seed + i) % 97) / 97);
}

gate('Aste extraction pipeline (integration)', () => {
  let app: INestApplication;
  let aiServer: Server;
  let aiPort = 0;
  let stop: (() => Promise<void>) | undefined;
  let extractFailRemaining = 0;

  const owner = asUser({
    sub: 'aste-pipe-owner',
    email: 'aste-pipe@example.it',
    name: 'Pipe Owner',
    roles: ['buyer'],
  });

  beforeAll(async () => {
    aiServer = createServer((req, res) => {
      if (req.headers['x-ec-internal'] !== 'int-aste-token') {
        res.writeHead(401);
        res.end('{}');
        return;
      }
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      req.on('end', () => {
        if (req.url === '/aste/ocr') {
          const rawBuf = Buffer.concat(chunks);
          const isPng = rawBuf.includes(0x89) && rawBuf.includes(Buffer.from('PNG'));
          const missingEcon = rawBuf.includes(Buffer.from('Nessun dato economico'));
          const body = {
            pages: [
              {
                page: 1,
                text: isPng
                  ? 'OCR SCAN Prezzo base 200000 Tribunale Milano'
                  : missingEcon
                    ? 'PERIZIA MISSING ECONOMICS Nessun dato economico Tribunale di Roma libero'
                    : 'PERIZIA Valore di stima 250000 Prezzo base 200000 Offerta minima 150000 Cauzione 10 Rilancio 2000 Superficie 95 Milano libero conforme',
                ocr_used: Boolean(isPng),
              },
            ],
            page_count: 1,
            ocr_pages: isPng ? 1 : 0,
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(body));
          return;
        }
        if (req.url === '/aste/extract') {
          if (extractFailRemaining > 0) {
            extractFailRemaining -= 1;
            res.writeHead(500);
            res.end('{}');
            return;
          }
          const raw = Buffer.concat(chunks).toString('utf8');
          const missing = /Nessun dato economico|MISSING ECONOMICS/.test(raw);
          const extraction = missing
            ? {
                schema_version: 2,
                procedura: {
                  tipo: 'rge',
                  numero: '99/2023',
                  tribunale: 'Roma',
                  rge: '99/2023',
                  lotto: '2',
                  giudice_delegato: null,
                  data_asta: null,
                  termine_offerte: null,
                  modalita: null,
                },
                economics: {
                  valore_stima: null,
                  prezzo_base: null,
                  offerta_minima: null,
                  cauzione: null,
                  rilancio_minimo: null,
                  superficie_commerciale_mq: null,
                },
                immobili: [
                  {
                    tipologia: 'appartamento',
                    piano: '3',
                    vani: 4,
                    locali: [],
                    categoria_catastale: null,
                    foglio: null,
                    particella: null,
                    subalterno: null,
                    rendita: null,
                    indirizzo: null,
                    comune: 'Roma',
                    provincia: 'RM',
                    note_valore: null,
                  },
                ],
                giuridica: {
                  diritto_venduto: null,
                  stato_occupazione: { stato: 'libero', dettaglio: null, opponibilita: null },
                  vincoli: [],
                  formalita: [],
                },
                urbanistica: {
                  conformita_urbanistica: { stato: null, dettaglio: null },
                  conformita_catastale: { stato: null, dettaglio: null },
                  difformita: [],
                },
                condizioni: { stato_manutentivo: null, impianti: null, lavori_stimati: null },
                spese: { condominiali_arretrate: null, oneri_acquirente: [] },
                meta: {
                  documents: [],
                  not_found: [
                    'economics.valore_stima',
                    'economics.prezzo_base',
                    'economics.offerta_minima',
                    'economics.cauzione',
                    'economics.rilancio_minimo',
                    'economics.superficie_commerciale_mq',
                  ],
                  warnings: [],
                  schema_version: 2,
                  lotto: null,
                  lotti_trovati: [],
                },
              }
            : {
                schema_version: 2,
                procedura: {
                  tipo: 'rge',
                  numero: '123/2024',
                  tribunale: 'Milano',
                  rge: '123/2024',
                  lotto: '1',
                  giudice_delegato: null,
                  data_asta: '2026-09-15',
                  termine_offerte: null,
                  modalita: 'telematica',
                },
                economics: {
                  valore_stima: { value: 250000, source: { file: 'x', page: 1 } },
                  prezzo_base: { value: 200000, source: { file: 'x', page: 1 } },
                  offerta_minima: { value: 150000, source: { file: 'x', page: 1 } },
                  cauzione: {
                    pct: 10,
                    base: 'prezzo_base',
                    importo: 20000,
                    source: { file: 'x', page: 1 },
                  },
                  rilancio_minimo: { value: 2000, source: { file: 'x', page: 1 } },
                  superficie_commerciale_mq: { value: 95, source: { file: 'x', page: 1 } },
                },
                immobili: [
                  {
                    tipologia: 'appartamento',
                    piano: null,
                    vani: null,
                    locali: [],
                    categoria_catastale: 'A/2',
                    foglio: null,
                    particella: null,
                    subalterno: null,
                    rendita: null,
                    indirizzo: null,
                    comune: 'Milano',
                    provincia: 'MI',
                    note_valore: null,
                  },
                ],
                giuridica: {
                  diritto_venduto: null,
                  stato_occupazione: { stato: 'libero', dettaglio: null, opponibilita: null },
                  vincoli: [],
                  formalita: [],
                },
                urbanistica: {
                  conformita_urbanistica: { stato: 'conforme', dettaglio: null },
                  conformita_catastale: { stato: 'conforme', dettaglio: null },
                  difformita: [],
                },
                condizioni: {
                  stato_manutentivo: 'buono',
                  impianti: 'ordinari',
                  lavori_stimati: null,
                },
                spese: { condominiali_arretrate: null, oneri_acquirente: [] },
                meta: {
                  documents: [],
                  not_found: [],
                  warnings: [],
                  schema_version: 2,
                  lotto: { label: '1', source: 'user' },
                  lotti_trovati: ['1'],
                },
              };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(extraction));
          return;
        }
        if (req.url === '/aste/embed') {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{"texts":[]}') as {
            texts: string[];
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              embeddings: (body.texts ?? []).map((_, i) => dim1536(i + 3)),
              dim: 1536,
            }),
          );
          return;
        }
        res.writeHead(404);
        res.end('{}');
      });
    });
    await new Promise<void>((r) => aiServer.listen(0, '127.0.0.1', r));
    const addr = aiServer.address();
    if (!addr || typeof addr === 'string') throw new Error('ai port');
    aiPort = addr.port;

    // Point the live apiConfig proxy at this file's AI mock. Do not start
    // a second PG/Meili/MinIO — isolate:false reuses the shared harness.
    process.env.AI_URL = `http://127.0.0.1:${aiPort}`;
    process.env.AI_INTERNAL_TOKEN = 'int-aste-token';
    process.env.ASTE_PIPELINE_POLL_MS = '60000';
    const { resetConfigCache } = await import('../../src/config');
    resetConfigCache();

    const ctx = await startIntegration();
    app = ctx.app;
    stop = async () => {
      await ctx.stop();
    };
  }, 300_000);

  afterAll(async () => {
    await stop?.();
    await new Promise<void>((r) => aiServer.close(() => r()));
  });

  it('submit → tick → ready with page refs, chunks, semaforo', async () => {
    const created = await request(app.getHttpServer())
      .post('/aste/analyses')
      .set(owner)
      .send({ language: 'it', register: 'investor' })
      .expect(201);
    const id = created.body.id as string;

    await request(app.getHttpServer())
      .post(`/aste/analyses/${id}/documents`)
      .set(owner)
      .field('docType', 'perizia')
      .attach('file', FIXTURE_NATIVE_PERIZIA, 'perizia.pdf')
      .expect(201);
    await request(app.getHttpServer())
      .post(`/aste/analyses/${id}/documents`)
      .set(owner)
      .field('docType', 'avviso')
      .attach('file', FIXTURE_NATIVE_AVVISO, 'avviso.pdf')
      .expect(201);
    await request(app.getHttpServer()).post(`/aste/analyses/${id}/submit`).set(owner).expect(201);

    const pipeline = app.get(AstePipelineService);
    await pipeline.tick();

    const got = await request(app.getHttpServer()).get(`/aste/analyses/${id}`).set(owner).expect(200);
    expect(got.body.status).toBe('ready');
    expect(got.body.extraction.economics.prezzo_base.value).toBe(200000);
    expect(got.body.extraction.economics.prezzo_base.source.page).toBe(1);
    expect(got.body.semaforo.occupazione).toBe('ok');
    expect(JSON.stringify(got.body.extraction)).not.toMatch(/Mario Rossi|Debitore Nome/i);

    const { getDb } = await import('../../src/db/drizzle');
    const { asteDocChunks, asteDocuments } = await import('../../src/db/schema');
    const { eq } = await import('drizzle-orm');
    const db = getDb();
    const docs = await db.select().from(asteDocuments).where(eq(asteDocuments.analysisId, id));
    expect(docs.length).toBe(2);
    const chunks = await db
      .select()
      .from(asteDocChunks)
      .where(eq(asteDocChunks.documentId, docs[0]!.id));
    expect(chunks.length).toBeGreaterThan(0);
  }, 120_000);

  it('missing economics → not_found + rischio_asta verify + ready', async () => {
    const created = await request(app.getHttpServer())
      .post('/aste/analyses')
      .set(owner)
      .send({ language: 'it', register: 'investor' })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .post(`/aste/analyses/${id}/documents`)
      .set(owner)
      .field('docType', 'perizia')
      .attach('file', FIXTURE_MISSING_ECONOMICS, 'missing.pdf')
      .expect(201);
    await request(app.getHttpServer())
      .post(`/aste/analyses/${id}/documents`)
      .set(owner)
      .field('docType', 'avviso')
      .attach('file', FIXTURE_NATIVE_AVVISO, 'avviso.pdf')
      .expect(201);
    await request(app.getHttpServer()).post(`/aste/analyses/${id}/submit`).set(owner).expect(201);

    await app.get(AstePipelineService).tick();
    const got = await request(app.getHttpServer()).get(`/aste/analyses/${id}`).set(owner).expect(200);
    expect(got.body.status).toBe('ready');
    expect(got.body.extraction.economics.prezzo_base).toBeNull();
    expect(got.body.extraction.meta.not_found.join(' ')).toMatch(/economics/);
    expect(got.body.semaforo.rischio_asta).toBe('verify');
  }, 120_000);

  it('scanned PNG exercises ocr_used path then ready', async () => {
    const created = await request(app.getHttpServer())
      .post('/aste/analyses')
      .set(owner)
      .send({ language: 'it', register: 'first_buyer' })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .post(`/aste/analyses/${id}/documents`)
      .set(owner)
      .field('docType', 'perizia')
      .attach('file', TINY_PNG, 'scan.png')
      .expect(201);
    await request(app.getHttpServer())
      .post(`/aste/analyses/${id}/documents`)
      .set(owner)
      .field('docType', 'avviso')
      .attach('file', FIXTURE_NATIVE_AVVISO, 'avviso.pdf')
      .expect(201);
    await request(app.getHttpServer()).post(`/aste/analyses/${id}/submit`).set(owner).expect(201);
    await app.get(AstePipelineService).tick();
    const got = await request(app.getHttpServer()).get(`/aste/analyses/${id}`).set(owner).expect(200);
    expect(got.body.status).toBe('ready');
    expect(got.body.extraction.meta.documents.some((d: { ocr_pages: number }) => d.ocr_pages > 0)).toBe(
      true,
    );
  }, 120_000);

  it('extract failures exhaust attempts → failed', async () => {
    extractFailRemaining = 5;
    const created = await request(app.getHttpServer())
      .post('/aste/analyses')
      .set(owner)
      .send({ language: 'it', register: 'investor' })
      .expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .post(`/aste/analyses/${id}/documents`)
      .set(owner)
      .field('docType', 'perizia')
      .attach('file', FIXTURE_NATIVE_PERIZIA, 'p.pdf')
      .expect(201);
    await request(app.getHttpServer()).post(`/aste/analyses/${id}/submit`).set(owner).expect(201);

    const pipeline = app.get(AstePipelineService);
    await pipeline.tick(); // attempt 1 → uploaded
    await pipeline.tick(); // attempt 2 → failed
    const got = await request(app.getHttpServer()).get(`/aste/analyses/${id}`).set(owner).expect(200);
    expect(got.body.status).toBe('failed');
    expect(got.body.failureReason).toBeTruthy();
    extractFailRemaining = 0;
  }, 120_000);
});
