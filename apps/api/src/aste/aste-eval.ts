#!/usr/bin/env tsx
/**
 * EC-23 operator eval — run full Nest pipeline against a directory of REAL perizie.
 * Keep real court documents OUT of git. Cloud agent does NOT run this.
 *
 * Usage: pnpm --filter @easycasa/api aste:eval /path/to/perizie
 *
 * Expects env: DATABASE_URL, ASTE_ANALYSIS_ENABLED=true, AI_URL, AI_INTERNAL_TOKEN,
 * S3/MinIO credentials, and a logged-in test path is NOT used — this script inserts
 * draft→upload→submit rows directly for a synthetic user id if EC_ASTE_EVAL_USER is set.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: pnpm --filter @easycasa/api aste:eval <dir>');
    process.exit(2);
  }
  const abs = path.resolve(dir);
  const files = readdirSync(abs).filter((f) => /\.(pdf|png|jpe?g)$/i.test(f));
  if (!files.length) {
    console.error('No PDF/JPG/PNG files found in', abs);
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      event: 'aste.eval_start',
      fileCount: files.length,
      note: 'Operator must have API+AI+DB+MinIO running with ASTE_ANALYSIS_ENABLED=true',
    }),
  );

  // Lightweight offline field checklist printer for operators (no network required).
  // Full pipeline run uses Nest AstePipelineService when EVAL_LIVE=1.
  if (process.env.EVAL_LIVE !== '1') {
    console.log('Files:');
    for (const f of files) {
      const st = statSync(path.join(abs, f));
      console.log(`- ${f} (${st.size} bytes)`);
    }
    console.log(
      [
        '',
        'Field hit/miss table (fill after live run):',
        'field\thit\tmiss\tnotes',
        'economics.valore_stima\t\t\t',
        'economics.prezzo_base\t\t\t',
        'economics.offerta_minima\t\t\t',
        'economics.cauzione\t\t\t',
        'economics.rilancio_minimo\t\t\t',
        'economics.superficie_commerciale_mq\t\t\t',
        'procedura.tipo\t\t\t',
        'procedura.numero\t\t\t',
        'procedura.tribunale\t\t\t',
        'procedura.rge\t\t\t',
        'immobili[0].comune\t\t\t',
        'meta.lotti_trovati\t\t\t',
        'person_names_absent\t\t\tmust be hit',
        '',
        'Set EVAL_LIVE=1 with running stack to execute AstePipelineService against uploads.',
      ].join('\n'),
    );
    return;
  }

  // Live mode: dynamic import Nest pipeline after env is ready.
  process.env.ASTE_ANALYSIS_ENABLED = 'true';
  const { resetConfigCache } = await import('../config');
  resetConfigCache();
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../app.module');
  const { AstePipelineService } = await import('../aste/aste-pipeline.service');
  const { AsteAnalysisService } = await import('../aste/aste-analysis.service');
  const { UsersService } = await import('../users/users.service');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const pipeline = app.get(AstePipelineService);
  const analyses = app.get(AsteAnalysisService);
  const users = app.get(UsersService);

  const email = process.env.EC_ASTE_EVAL_USER || 'aste-eval@example.it';
  const me = await users.getOrCreate({
    sub: `eval-${email}`,
    email,
    name: 'Aste Eval',
    roles: ['buyer'],
  } as never);

  const created = await analyses.create(me.id, { language: 'it', register: 'investor' });
  for (const f of files.slice(0, 20)) {
    const buf = readFileSync(path.join(abs, f));
    const mime = f.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : f.toLowerCase().endsWith('.png')
        ? 'image/png'
        : 'image/jpeg';
    const docType = /avviso/i.test(f) ? 'avviso' : /ordinanza/i.test(f) ? 'ordinanza' : 'perizia';
    await analyses.uploadDocument(
      me.id,
      created.id,
      { buffer: buf, mimetype: mime, originalname: f, size: buf.length },
      docType as 'perizia' | 'avviso' | 'ordinanza' | 'planimetria' | 'altro',
    );
  }
  await analyses.submit(me.id, created.id);

  // Drive worker until ready/failed or timeout.
  const deadline = Date.now() + Number(process.env.ASTE_EVAL_TIMEOUT_MS || 900_000);
  let status = 'uploaded';
  while (Date.now() < deadline) {
    await pipeline.tick();
    const row = await analyses.get(me.id, created.id);
    status = row.status;
    if (status === 'ready' || status === 'failed') break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  const final = await analyses.get(me.id, created.id);
  const extraction = (final as { extraction?: Record<string, unknown> }).extraction;
  console.log(JSON.stringify({ event: 'aste.eval_done', analysisId: created.id, status: final.status }));
  if (extraction) {
    const economics = (extraction.economics ?? {}) as Record<string, unknown>;
    for (const k of Object.keys(economics)) {
      const hit = economics[k] != null;
      console.log(`${k}\t${hit ? 'hit' : 'miss'}`);
    }
    const meta = (extraction.meta ?? {}) as { not_found?: string[] };
    console.log('not_found\t' + (meta.not_found ?? []).join(','));
  }
  await app.close();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
