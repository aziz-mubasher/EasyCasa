import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../app.module';
import { resetConfigCache } from '../../config';
import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { importOmiValoriFromPath } from '../import/import-valori';

function usage(): never {
  console.error(`Usage:
  DATABASE_URL=… node dist/omi/import/run-import.js --input <path-or-url> --licence-url <url> [--semester YYYY-H1|H2] [--comune-level]

Documents the CC BY 4.0 (or counsel-approved) source you are importing. Do not commit CSV blobs to git.
`);
  process.exit(1);
}

function parseArgs(argv: string[]): {
  input?: string;
  licenceUrl?: string;
  semester?: string;
  comuneLevel: boolean;
} {
  const out: {
    input?: string;
    licenceUrl?: string;
    semester?: string;
    comuneLevel: boolean;
  } = { comuneLevel: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--input') out.input = argv[++i];
    else if (a === '--licence-url') out.licenceUrl = argv[++i];
    else if (a === '--semester') out.semester = argv[++i];
    else if (a === '--comune-level') out.comuneLevel = true;
    else if (a === '--help' || a === '-h') usage();
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.licenceUrl) usage();

  resetConfigCache();
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const db = app.get(DRIZZLE) as Db;
    const report = await importOmiValoriFromPath(db, args.input, {
      licenceUrl: args.licenceUrl,
      period: args.semester,
      comuneLevelOnly: args.comuneLevel,
    });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await app.close();
  }
}

void main();
