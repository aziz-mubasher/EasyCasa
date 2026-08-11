import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';

import { AstePipelineService } from '../../src/aste/aste-pipeline.service';
import type { AsteExtractionV2 } from '../../src/aste/extraction-schema';
import { emptyImmobileUnit } from '../../src/aste/extraction-schema';

function dim1536(seed: number): number[] {
  return Array.from({ length: 1536 }, (_, i) => ((seed + i) % 97) / 97);
}

function extractionReady(): AsteExtractionV2 {
  const imm = emptyImmobileUnit();
  imm.tipologia = 'appartamento';
  imm.categoria_catastale = 'A/2';
  imm.comune = 'Milano';
  imm.provincia = 'MI';
  return {
    schema_version: 2,
    procedura: {
      tipo: 'rge',
      numero: '123/2024',
      tribunale: 'Milano',
      rge: '123/2024',
      lotto: '1',
      giudice_delegato: null,
      data_asta: '2026-09-15',
      termine_offerte: '2026-09-10',
      modalita: 'telematica',
    },
    economics: {
      valore_stima: { value: 250000, source: { file: 'doc-perizia', page: 1 } },
      prezzo_base: { value: 200000, source: { file: 'doc-perizia', page: 1 } },
      offerta_minima: { value: 150000, source: { file: 'doc-perizia', page: 1 } },
      cauzione: {
        pct: 10,
        base: 'prezzo_base',
        importo: null,
        source: { file: 'doc-perizia', page: 1 },
      },
      rilancio_minimo: { value: 2000, source: { file: 'doc-perizia', page: 1 } },
      superficie_commerciale_mq: { value: 95, source: { file: 'doc-perizia', page: 1 } },
    },
    immobili: [imm],
    giuridica: {
      diritto_venduto: 'piena proprietà',
      stato_occupazione: { stato: 'libero', dettaglio: null, opponibilita: null },
      vincoli: [],
      formalita: [],
    },
    urbanistica: {
      conformita_urbanistica: { stato: 'conforme', dettaglio: null },
      conformita_catastale: { stato: 'conforme', dettaglio: null },
      difformita: [],
    },
    condizioni: { stato_manutentivo: 'buono', impianti: 'ordinari', lavori_stimati: null },
    spese: { condominiali_arretrate: null, oneri_acquirente: [] },
    meta: {
      documents: [],
      not_found: ['spese.condominiali_arretrate'],
      warnings: [],
      schema_version: 2,
      lotto: { label: '1', source: 'user' },
      lotti_trovati: ['1'],
    },
  };
}

describe('AstePipelineService (unit with mock AI)', () => {
  it('runs ocr→extract→embed and marks ready', async () => {
    const analysisId = '11111111-1111-1111-1111-111111111111';
    const docPerizia = {
      id: 'doc-perizia',
      analysisId,
      minioKey: 'users/u/aste/a/doc-perizia/p.pdf',
      originalFilename: 'p.pdf',
      docType: 'perizia',
      mime: 'application/pdf',
      sizeBytes: 100,
      pageCount: null,
      ocrStatus: 'pending',
      createdAt: new Date(),
    };
    const docAvviso = {
      ...docPerizia,
      id: 'doc-avviso',
      minioKey: 'users/u/aste/a/doc-avviso/a.pdf',
      docType: 'avviso',
      sizeBytes: 80,
    };

    const updates: Array<Record<string, unknown>> = [];
    const insertedChunks: unknown[] = [];

    const db = {
      select: () => ({
        from: () => ({
          where: async () => [docPerizia, docAvviso],
        }),
      }),
      update: () => ({
        set: (vals: Record<string, unknown>) => ({
          where: async () => {
            updates.push(vals);
            return [];
          },
        }),
      }),
      delete: () => ({
        where: async () => [],
      }),
      execute: async () => {
        insertedChunks.push(1);
        return { rows: [] };
      },
    };

    const storage = {
      getObject: vi.fn(async () => ({
        body: Buffer.from('%PDF-stub'),
        contentType: 'application/pdf',
      })),
    };

    const ai = {
      ocr: vi.fn(async () => ({
        pages: [{ page: 1, text: 'Valore di stima 250000 Prezzo base 200000', ocr_used: false }],
        page_count: 1,
        ocr_pages: 0,
      })),
      extract: vi.fn(async () => extractionReady()),
      embed: vi.fn(async (texts: string[]) => texts.map((_, i) => dim1536(i + 1))),
    };

    const analytics = { track: vi.fn() };

    const svc = new AstePipelineService(
      db as never,
      {
        ASTE_PIPELINE_MAX_ATTEMPTS: 2,
        ASTE_PIPELINE_STALE_MS: 1_800_000,
      } as never,
      storage as never,
      ai as never,
      analytics as never,
    );

    await svc.runClaimed({
      id: analysisId,
      user_id: 'user-1',
      language: 'it',
      attempts: 1,
      lotto_label: null,
    });

    expect(ai.ocr).toHaveBeenCalledTimes(2);
    expect(ai.extract).toHaveBeenCalledTimes(1);
    expect(ai.embed).toHaveBeenCalled();
    expect(insertedChunks.length).toBeGreaterThan(0);
    const readyUpdate = updates.find((u) => u.status === 'ready');
    expect(readyUpdate).toBeTruthy();
    expect(readyUpdate!.extraction).toBeTruthy();
    expect(readyUpdate!.semaforo).toMatchObject({
      occupazione: 'ok',
      rischio_asta: 'ok',
      buyer_readiness: 'unknown',
    });
    expect(analytics.track).toHaveBeenCalled();
  });

  it('retries then fails when extract throws', async () => {
    const analysisId = '22222222-2222-2222-2222-222222222222';
    const doc = {
      id: 'doc-1',
      analysisId,
      minioKey: 'users/u/aste/a/doc-1/p.pdf',
      originalFilename: 'p.pdf',
      docType: 'perizia',
      mime: 'application/pdf',
      sizeBytes: 10,
      pageCount: null,
      ocrStatus: 'pending',
      createdAt: new Date(),
    };
    const statusUpdates: string[] = [];
    const db = {
      select: () => ({
        from: () => ({
          where: async () => [doc],
        }),
      }),
      update: () => ({
        set: (vals: Record<string, unknown>) => ({
          where: async () => {
            if (typeof vals.status === 'string') statusUpdates.push(vals.status);
            return [];
          },
        }),
      }),
      delete: () => ({ where: async () => [] }),
      execute: async () => ({ rows: [] }),
    };
    const storage = {
      getObject: vi.fn(async () => ({ body: Buffer.from('x'), contentType: 'application/pdf' })),
    };
    const ai = {
      ocr: vi.fn(async () => ({
        pages: [{ page: 1, text: 'x', ocr_used: false }],
        page_count: 1,
        ocr_pages: 0,
      })),
      extract: vi.fn(async () => {
        throw new Error('HTTP 500');
      }),
      embed: vi.fn(),
    };
    const analytics = { track: vi.fn() };
    const svc = new AstePipelineService(
      db as never,
      { ASTE_PIPELINE_MAX_ATTEMPTS: 2, ASTE_PIPELINE_STALE_MS: 1_800_000 } as never,
      storage as never,
      ai as never,
      analytics as never,
    );

    await svc.runClaimed({
      id: analysisId,
      user_id: 'u',
      language: 'it',
      attempts: 2,
      lotto_label: null,
    });
    expect(statusUpdates).toContain('failed');
  });
});

describe('mock AI HTTP server contract', () => {
  it('serves /aste/embed with token', async () => {
    const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.headers['x-ec-internal'] !== 'tok') {
        res.writeHead(401);
        res.end('{}');
        return;
      }
      if (req.url === '/aste/embed') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ embeddings: [dim1536(1)], dim: 1536 }));
        return;
      }
      res.writeHead(404);
      res.end('{}');
    });
    await new Promise<void>((r) => server.listen(0, r));
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('no port');
    const res = await fetch(`http://127.0.0.1:${addr.port}/aste/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-EC-Internal': 'tok' },
      body: JSON.stringify({ texts: ['a'] }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { dim: number };
    expect(body.dim).toBe(1536);
    server.close();
  });
});
