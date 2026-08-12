#!/usr/bin/env tsx
/**
 * EC-23 / G1 operator eval — run full Nest pipeline against a directory of REAL perizie.
 * Keep real court documents OUT of git. Cloud agent does NOT run this.
 *
 * Usage:
 *   pnpm --filter @easycasa/api aste:eval /path/to/perizie
 *   pnpm --filter @easycasa/api aste:eval /path/to/perizie --lotto 4
 *   EC_ASTE_EVAL_LOTTO=H EVAL_LIVE=1 pnpm --filter @easycasa/api aste:eval /path/to/Ex7
 *
 * Env (EVAL_LIVE=1):
 *   DATABASE_URL, ASTE_ANALYSIS_ENABLED=true, AI_URL, AI_INTERNAL_TOKEN,
 *   S3/MinIO credentials, CHAT_PROVIDER=openai + OPENAI_API_KEY on the AI service,
 *   optional EC_ASTE_EVAL_USER, EC_ASTE_EVAL_LOTTO, ASTE_EVAL_TIMEOUT_MS.
 *
 * Multi-lot dossiers (post EC-23b): pass --lotto / EC_ASTE_EVAL_LOTTO or create fails
 * with lotto_selection_required after extract.
 *
 * Score against AZM Drive: EC_Aste_GoldenSet_GroundTruth_v1.md (not in git).
 * See docs/runbooks/aste-g1-gate.md for the G1 pass bar and minimum dossier set.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { printExtractionScoreTable } from './aste-eval-scorer';

function parseArgs(argv: string[]): { dir: string | undefined; lotto: string | null } {
  let dir: string | undefined;
  let lotto: string | null = process.env.EC_ASTE_EVAL_LOTTO?.trim() || null;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lotto' || a === '-l') {
      lotto = (argv[++i] ?? '').trim() || null;
      continue;
    }
    if (a.startsWith('--lotto=')) {
      lotto = a.slice('--lotto='.length).trim() || null;
      continue;
    }
    if (!a.startsWith('-') && !dir) {
      dir = a;
    }
  }
  return { dir, lotto };
}

async function main() {
  const { dir, lotto } = parseArgs(process.argv);
  if (!dir) {
    console.error(
      'Usage: pnpm --filter @easycasa/api aste:eval <dir> [--lotto <label>]',
    );
    process.exit(2);
  }
  const abs = path.resolve(dir);
  // Skip macOS AppleDouble sidecars (._*) — they match *.pdf on external volumes
  // and corrupt live uploads if included.
  const files = readdirSync(abs).filter(
    (f) => /\.(pdf|png|jpe?g)$/i.test(f) && !f.startsWith('._') && !f.startsWith('.DS_Store'),
  );
  if (!files.length) {
    console.error('No PDF/JPG/PNG files found in', abs);
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      event: 'aste.eval_start',
      fileCount: files.length,
      lottoLabel: lotto,
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
        `lottoLabel: ${lotto ?? '(none — required for multi-lot dossiers)'}`,
        '',
        'Field hit/miss table (fill after live run / GT score):',
        'field\thit\tvalue\tpage\tnotes',
        'economics.valore_stima\t\t\t\t',
        'economics.prezzo_base\t\t\t\tEx2: avviso €36.039/€64.906 not ordinanza',
        'economics.offerta_minima\t\t\t\t',
        'economics.cauzione\t\t\t\t',
        'economics.rilancio_minimo\t\t\t\t',
        'occupazione\t\t\t\t',
        'conformita\t\t\t\tlotto H not non-conform',
        'procedura.tipo\t\t\t\t',
        'meta.lotti_trovati\t\t\t\t',
        'person_names_absent\t\t\t\tmust be hit',
        'invented_values\t\t\t\tmust be zero (misses → not_found)',
        '',
        'Set EVAL_LIVE=1 with running stack to execute AstePipelineService against uploads.',
        'See docs/runbooks/aste-g1-gate.md',
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

  const created = await analyses.create(me.id, {
    language: 'it',
    register: 'investor',
    lottoLabel: lotto,
  });
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
  console.log(
    JSON.stringify({
      event: 'aste.eval_done',
      analysisId: created.id,
      status: final.status,
      lottoLabel: lotto,
      failureReason: (final as { failureReason?: string | null }).failureReason ?? null,
    }),
  );
  const extraction = (final as { extraction?: Record<string, unknown> }).extraction;
  if (extraction) {
    printExtractionScoreTable(extraction);
  } else {
    console.log('No extraction on final row — check failureReason / logs.');
  }
  await app.close();
  // Nest keeps the event loop alive (timers/handles) after close in some boots.
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
});
