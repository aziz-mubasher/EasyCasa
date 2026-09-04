import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

/**
 * Integration harness — Phase 34.
 *
 * Spins up Postgres from `infra/postgres/Dockerfile` (PostGIS + pgvector from
 * source) and Meilisearch, applies REAL migrations, then boots the REAL
 * `AppModule` with `JwtAuthGuard` swapped for `TestAuthGuard` via
 * `overrideProvider` (requires AuthModule APP_GUARD to use `useExisting`).
 *
 * No Nest global `/api` prefix — Traefik strips `/api` in production; tests hit
 * the same paths the app listens on (`/health`, `/search/bounds`, …).
 *
 * Requires Docker. Specs gate via `dockerAvailable()`.
 */
export interface IntegrationContext {
  app: INestApplication;
  databaseUrl: string;
  stop: () => Promise<void>;
}

const MEILI_IMAGE = 'getmeili/meilisearch:v1.10';
export const PG_IMAGE = 'easycasa-postgres-int';

/** Same `docker build` path as `.github/workflows/omi-load.yml` (testcontainers fromDockerfile flakes on empty TARGETPLATFORM). */
export function ensurePostgresImage(): string {
  try {
    execFileSync('docker', ['image', 'inspect', PG_IMAGE], { stdio: 'ignore' });
    return PG_IMAGE;
  } catch {
    const postgresContext = path.resolve(process.cwd(), '../../infra/postgres');
    execFileSync('docker', ['build', '-t', PG_IMAGE, postgresContext], { stdio: 'inherit' });
    return PG_IMAGE;
  }
}

/** Shared across int specs in one vitest fork (lazy pool + one AppModule boot). */
let shared: Promise<IntegrationContext> | null = null;
let refs = 0;

export async function startIntegration(): Promise<IntegrationContext> {
  if (!shared) shared = bootOnce();
  const ctx = await shared;
  refs += 1;
  return {
    app: ctx.app,
    databaseUrl: ctx.databaseUrl,
    stop: async () => {
      refs -= 1;
      if (refs > 0) return;
      await ctx.stop();
    },
  };
}

async function bootOnce(): Promise<IntegrationContext> {
  ensurePostgresImage();

  const pg: StartedPostgreSqlContainer = await new PostgreSqlContainer(PG_IMAGE)
    .withDatabase('easycasa_test')
    .withUsername('easycasa')
    .withPassword('easycasa')
    .start();

  const meili: StartedTestContainer = await new GenericContainer(MEILI_IMAGE)
    .withEnvironment({ MEILI_MASTER_KEY: 'test', MEILI_ENV: 'development' })
    .withExposedPorts(7700)
    .withWaitStrategy(Wait.forHttp('/health', 7700))
    .start();

  const databaseUrl = pg.getConnectionUri();
  const meiliUrl = `http://${meili.getHost()}:${meili.getMappedPort(7700)}`;

  process.env.NODE_ENV = 'test';
  process.env.ALLOW_PROVIDER_STUBS = 'true';
  process.env.DATABASE_URL = databaseUrl;
  process.env.MEILI_URL = meiliUrl;
  process.env.MEILI_MASTER_KEY = 'test';
  process.env.API_PORT = '4000';
  // EC-17 — fail-closed signature on webhook; enable Cloud client for auto-reply tests.
  process.env.WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || 'int-test-wa-secret';
  process.env.WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'int-tok';
  process.env.WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || 'int-pnid';
  process.env.WHATSAPP_INBOUND_OPS_EMAIL =
    process.env.WHATSAPP_INBOUND_OPS_EMAIL || 'ops@example.com';
  process.env.WA_HANDLE_SECRET =
    process.env.WA_HANDLE_SECRET || 'int-test-wa-handle-secret';

  const { resetConfigCache } = await import('../../src/config');
  resetConfigCache();
  const { resetDbConnection } = await import('../../src/db/drizzle');
  await resetDbConnection();

  // Real migrations via the repo runner (0001…0019), not a re-implementation.
  const repoRoot = path.resolve(process.cwd(), '../..');
  execFileSync('pnpm', ['--filter', '@easycasa/migration', 'migrate'], {
    stdio: 'inherit',
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  const { AppModule } = await import('../../src/app.module');
  const { JwtAuthGuard } = await import('../../src/auth/jwt.guard');
  const { TestAuthGuard } = await import('./test-auth');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(JwtAuthGuard)
    .useClass(TestAuthGuard)
    .compile();

  const app = moduleRef.createNestApplication({ rawBody: true });
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.init();

  return {
    app,
    databaseUrl,
    stop: async () => {
      await app.close().catch(() => undefined);
      await resetDbConnection();
      await meili.stop().catch(() => undefined);
      await pg.stop().catch(() => undefined);
      shared = null;
    },
  };
}

/** True when a Docker daemon is reachable; used to skip container specs elsewhere. */
export function dockerAvailable(): boolean {
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
