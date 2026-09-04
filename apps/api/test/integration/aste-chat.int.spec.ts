import { type INestApplication } from '@nestjs/common';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { computeSemaforo } from '../../src/aste/aste-semaforo';
import { fixtureReadyExtraction } from '../fixtures/aste/ready-extraction';
import { dockerAvailable, startIntegration } from './harness';
import { asUser } from './test-auth';

const gate = dockerAvailable() ? describe : describe.skip;

function dim1536(seed: number): number[] {
  return Array.from({ length: 1536 }, (_, i) => ((seed + i) % 97) / 97);
}

gate('Aste chat (integration EC-25)', () => {
  let app: INestApplication;
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

    process.env.AI_URL = `http://127.0.0.1:${aiPort}`;
    process.env.AI_INTERNAL_TOKEN = 'int-aste-token';
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
    await new Promise<void>((resolve) => aiServer.close(() => resolve()));
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
    const { analysisId, avvisoId, periziaId } = await seedReadyWithChunks();
    translateCalls = 0;

    const itAsk = await request(api())
      .post(`/aste/analyses/${analysisId}/chat`)
      .set(owner)
      .send({ question: 'Qual è il prezzo base?', lang: 'it' });
    expect([200, 201]).toContain(itAsk.status);
    expect(itAsk.body.assistantMessage.citations.length).toBeGreaterThanOrEqual(1);
    expect([avvisoId, periziaId]).toContain(itAsk.body.assistantMessage.citations[0].document_id);
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
