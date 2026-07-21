/**
 * CLI: run the seeker smoke against a deployed instance — Phase 40.
 *   BASE_URL=https://easycasaita.com/api \
 *   [SMOKE_BEARER=<token>] [SMOKE_TARGET=live|contract] \
 *   node dist/pilot/smoke/run-smoke.js
 * Exits non-zero on any failed step (CI-friendly).
 */
import { runSeekerSmoke } from './pilot-smoke';

async function main(): Promise<void> {
  const baseUrl = process.env.BASE_URL ?? process.argv[2];
  if (!baseUrl) {
    console.error('usage: BASE_URL=<url> run-smoke  (or pass url as arg)');
    process.exit(2);
  }
  const authHeaders = process.env.SMOKE_BEARER
    ? { authorization: `Bearer ${process.env.SMOKE_BEARER}` }
    : process.env.SMOKE_DEV_USER
      ? {
          'x-dev-user': process.env.SMOKE_DEV_USER,
          'x-dev-roles': process.env.SMOKE_DEV_ROLES ?? 'buyer',
          'x-dev-email': process.env.SMOKE_DEV_EMAIL ?? 'smoke@easycasaita.com',
        }
      : undefined;
  const target = process.env.SMOKE_TARGET === 'live' ? 'live' : 'contract';
  const report = await runSeekerSmoke({ baseUrl, authHeaders, target });
  for (const s of report.steps) {
    console.log(`${s.ok ? 'PASS' : 'FAIL'}  ${s.name}${s.detail ? ' — ' + s.detail : ''}`);
  }
  console.log(`\n${report.ok ? 'SMOKE OK' : 'SMOKE FAILED'} (${report.durationMs}ms)`);
  process.exit(report.ok ? 0 : 1);
}
void main();
